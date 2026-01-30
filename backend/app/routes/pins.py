from flask import Blueprint, jsonify, request
from app.services.pin_config import save_config, load_config
from app.services.quartus import program_green, program_de10
from app.services.verilog_generator import generate_verilog
import csv
import os
import pandas as pd
import werkzeug
import glob
from app.config.quartus_config import DATA_FILES

bp = Blueprint('pins', __name__, url_prefix='/api/pins')

def get_pin_names():
    """Читает имена пинов из CSV файлов"""
    pin_names = []
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    config_path = os.path.join(base_path, "config")
    de10_csv_path = os.path.join(config_path, "de10lite.csv")
    perif_csv_path = os.path.join(config_path, "perif.csv")

    try:
        # Читаем CSV файлы
        de10_df = pd.read_csv(de10_csv_path)
        perif_df = pd.read_csv(perif_csv_path)

        # Создаем списки имен пинов
        left_pins = perif_df['Perifery'].tolist()  # Теперь left - это Perifery
        right_pins = de10_df['DE10-Lite'].tolist()  # Теперь right - это DE10-Lite

        # Формируем список пар
        for left in left_pins:
            for right in right_pins:
                pin_names.append({
                    'left': left,
                    'right': right
                })

        return pin_names
    except Exception as e:
        print(f"Error reading pin names: {e}")
        return []

@bp.route('/config', methods=['POST'])
def save_pin_config():
    """Сохранить конфигурацию пинов"""
    print("Received POST request with data:", request.json)
    config = request.json
    
    # Проверяем формат данных
    if 'connections' in config:
        connections = config['connections']
        if not isinstance(connections, list):
            return jsonify({"error": "Connections must be a list of [left_pin, right_pin] pairs"}), 400
        
        # Проверяем, что все пары содержат строки (имена пинов)
        for pair in connections:
            if not isinstance(pair, list) or len(pair) != 2 or not all(isinstance(pin, str) for pin in pair):
                return jsonify({"error": "Each connection must be a pair of pin names"}), 400
    
    try:
        save_config(config)
        print("Configuration saved successfully")
        return jsonify({"message": "Configuration saved successfully"}), 200
    except Exception as e:
        print("Error saving configuration:", str(e))
        return jsonify({"error": str(e)}), 400

@bp.route('/config', methods=['GET'])
def get_pin_config():
    """Получить текущую конфигурацию пинов"""
    print("Received GET request for config")
    try:
        config = load_config()
        print("Loaded config:", config)
        return jsonify(config), 200
    except Exception as e:
        print("Error loading configuration:", str(e))
        return jsonify({"error": str(e)}), 400

@bp.route('/verilog', methods=['GET'])
def get_verilog():
    """Сгенерировать Verilog код"""
    try:
        config = load_config()
        if 'connections' in config:
            print("Generating Verilog for connections:", config['connections'])
            verilog_code = generate_verilog(config['connections'])
            print("Generated Verilog code:", verilog_code)
            return jsonify({"verilog_code": verilog_code}), 200
        else:
            return jsonify({"error": "No connections found"}), 400
    except Exception as e:
        print(f"Error generating Verilog: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route('/program', methods=['POST'])
def program_fpga():
    """Скомпилировать проект и прошить FPGA"""
    try:
        result = program_green()
        if result == 0:
            return jsonify({
                "message": "FPGA programmed successfully"
            }), 200
        else:
            return jsonify({
                "error": "Programming failed"
            }), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/names', methods=['GET'])
def get_pin_names_route():
    """Возвращает список имен пинов"""
    return jsonify({'pin_names': get_pin_names()})

@bp.route('/upload_sof', methods=['POST'])
def upload_sof():
    """Загрузка .sof файла для DE10"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if not file.filename.lower().endswith('.sof'):
        return jsonify({'error': 'Only .sof files are allowed'}), 400

    # Создаём директорию, если её нет
    upload_dir = DATA_FILES['de10_upload_dir']
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, werkzeug.utils.secure_filename(file.filename))
    file.save(save_path)
    print(f"SOF file uploaded to: {save_path}")
    return jsonify({'message': 'File uploaded', 'sof_path': save_path}), 200

@bp.route('/sof_files', methods=['GET'])
def list_sof_files():
    """Возвращает список .sof файлов для DE10"""
    upload_dir = DATA_FILES['de10_upload_dir']
    files = glob.glob(os.path.join(upload_dir, '*.sof'))
    return jsonify({'files': files})

@bp.route('/program_de10', methods=['POST'])
def program_de10_route():
    """Прошить DE10-Lite с помощью указанного .sof файла"""
    data = request.get_json()
    sof_path = data.get('sof_path')
    if not sof_path or not os.path.isfile(sof_path):
        return jsonify({'error': 'sof_path not provided or file does not exist'}), 400
    result = program_de10(sof_path=sof_path)
    if result == 0:
        return jsonify({'message': 'DE10 успешно прошита'}), 200
    else:
        return jsonify({'error': 'Ошибка прошивки DE10'}), 400

@bp.route('/api/pins/config', methods=['GET'])
def get_pins_config():
    try:
        # Читаем CSV файлы
        de10_df = pd.read_csv(DATA_FILES['de10lite'])
        perif_df = pd.read_csv(DATA_FILES['perif'])

        # Формируем ответ
        response = {
            'de10_pins': de10_df['DE10-Lite'].tolist(),
            'perif_pins': perif_df['Perifery'].tolist()
        }
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/pins/save', methods=['POST'])
def save_pins_config():
    try:
        data = request.get_json()
        connections = data.get('connections', [])
        
        # Генерируем Verilog код
        verilog_code = generate_verilog(connections)
        
        return jsonify({'message': 'Configuration saved successfully', 'verilog': verilog_code})
    except Exception as e:
        return jsonify({'error': str(e)}), 500