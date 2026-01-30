import os
from pathlib import Path
from app.config.paths import BASE_DIR

# Пути к исполняемым файлам Quartus
# ВАЖНО: Замените на реальные пути к Quartus на вашей системе!
QUARTUS_PATHS = {
    'quartus_sh': '/opt/intelFPGA_lite/21.1/quartus/bin/quartus_sh',
    'quartus_pgm': '/opt/intelFPGA_lite/21.1/quartus/bin/quartus_pgm'
}

# Настройки проекта Quartus
QUARTUS_PROJECT = {
    # Директория с проектом Quartus
    'dir': os.path.join(BASE_DIR, 'quartus_project'),
    # Имя проекта (без расширения)
    'name': 'pin_matrix',
}

# Производные пути
QUARTUS_FILES = {
    # Путь к файлу проекта (.qpf)
    'project_file': os.path.join(QUARTUS_PROJECT['dir'], f"{QUARTUS_PROJECT['name']}.qpf"),
    # Путь к файлу настроек (.qsf)
    'settings_file': os.path.join(QUARTUS_PROJECT['dir'], f"{QUARTUS_PROJECT['name']}.qsf"),
    # Путь к выходному файлу прошивки (.sof)
    'output_sof': os.path.join(QUARTUS_PROJECT['dir'], 'output_files', f"{QUARTUS_PROJECT['name']}.sof"),
    # Путь к сгенерированному Verilog файлу
    'verilog_file': os.path.join(BASE_DIR, 'data', 'pin_matrix.v')
}

# Пути к файлам данных
DATA_FILES = {
    'de10lite': os.path.join(BASE_DIR, 'data', 'de10lite.csv'),
    'perif': os.path.join(BASE_DIR, 'data', 'perif.csv'),
    'green_v': os.path.join(BASE_DIR, 'data', '2161_Green', 'GreenP.v'),
    'pin_connections': os.path.join(BASE_DIR, 'data', 'pin_connections.json'),
    'de10_upload_dir': os.path.join(BASE_DIR, 'data', 'de10_upload')
} 