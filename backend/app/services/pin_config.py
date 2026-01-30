import json
from pathlib import Path
from app.config.paths import BASE_DIR

CONFIG_FILE = BASE_DIR / 'data' / 'pin_connections.json'

def save_config(config):
    """Сохраняет конфигурацию в JSON файл"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)

def load_config():
    """Загружает конфигурацию из JSON файла"""
    if not CONFIG_FILE.exists():
        return {'connections': []}
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f) 