from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from pathlib import Path
from app.config.quartus_config import DATA_FILES

def create_app():
    app = Flask(__name__)
    CORS(app)  # Простая настройка CORS

    # Регистрируем маршруты
    from app.routes import pins
    app.register_blueprint(pins.bp)
    from app.routes import buttons
    app.register_blueprint(buttons.bp)

    # Создаем начальную конфигурацию, если её нет
    config_file = Path(DATA_FILES['pin_connections'])
    if not config_file.exists():
        with open(config_file, 'w') as f:
            json.dump({'connections': []}, f, indent=4)

    # Загружаем начальную конфигурацию
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
        config = {'connections': []}

    # Создаем директорию для загрузки .sof файлов, если её нет
    de10_upload_dir = Path(DATA_FILES['de10_upload_dir'])
    de10_upload_dir.mkdir(exist_ok=True)

    def generate_verilog_code(connections):
        # Определяем размеры матрицы
        max_row = 0
        max_col = 0
        for conn in connections:
            row, col = map(int, conn.split('-'))
            max_row = max(max_row, row)
            max_col = max(max_col, col)
        
        # Создаем шаблон модуля
        verilog_code = []
        verilog_code.append("module pin_matrix (")
        verilog_code.append(f"    input wire [{max_row}:0] inputs,")
        verilog_code.append(f"    output wire [{max_col}:0] outputs")
        verilog_code.append(");")
        verilog_code.append("")
        
        # Добавляем assign statements для каждого соединения
        for conn, is_connected in connections.items():
            if is_connected:
                row, col = map(int, conn.split('-'))
                verilog_code.append(f"    assign outputs[{col}] = inputs[{row}];")
        
        verilog_code.append("")
        verilog_code.append("endmodule")
        
        return "\n".join(verilog_code)

    @app.route('/api/pins/config', methods=['GET', 'POST'])
    def handle_config():
        if request.method == 'POST':
            data = request.get_json()
            print("Received POST request with data:", data)
            
            # Save configuration to file
            with open(DATA_FILES['pin_connections'], 'w') as f:
                json.dump(data, f)
            
            print("Configuration saved successfully")
            return jsonify({"message": "Configuration saved successfully"})
        else:
            print("Received GET request for config")
            try:
                with open(DATA_FILES['pin_connections'], 'r') as f:
                    config = json.load(f)
                    print("Loaded config:", config)
                    return jsonify(config)
            except FileNotFoundError:
                return jsonify({"connections": {}})

    @app.route('/api/pins/verilog', methods=['GET'])
    def get_verilog():
        try:
            with open(DATA_FILES['pin_connections'], 'r') as f:
                config = json.load(f)
                connections = config.get('connections', {})
                verilog_code = generate_verilog_code(connections)
                
                # Сохраняем Verilog код в файл
                os.makedirs('data', exist_ok=True)
                with open('data/pin_matrix.v', 'w') as f:
                    f.write(verilog_code)
                
                return jsonify({
                    "message": "Verilog code generated and saved to data/pin_matrix.v",
                    "verilog_code": verilog_code
                })
        except FileNotFoundError:
            return jsonify({"error": "No configuration found"}), 404

    return app 