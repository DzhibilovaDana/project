#!/usr/bin/env python3
"""
Простой скрипт для прошивки FPGA платы с использованием Quartus CLI.
Предполагается, что все необходимые файлы Quartus и Verilog уже созданы.
"""

import subprocess
import os
import argparse
import sys
from pathlib import Path

def run_command(command, description):
    """Запуск команды с выводом подробной информации"""
    print(f"\n----- Выполняю: {description} -----")
    print(f"Команда: {command}")
    
    try:
        process = subprocess.run(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print(f"Код возврата: {process.returncode}")
        
        if process.stdout:
            print("\n--- СТАНДАРТНЫЙ ВЫВОД ---")
            print(process.stdout)
        
        if process.stderr:
            print("\n--- ОШИБКИ ---")
            print(process.stderr)
        
        if process.returncode != 0:
            print(f"ОШИБКА: {description} завершилось с ошибкой!")
            return False
        
        print(f"УСПЕХ: {description} завершилось успешно")
        return True
    
    except Exception as e:
        print(f"ИСКЛЮЧЕНИЕ: {e}")
        return False

def compile_quartus_project(quartus_sh_path, project_path):
    """Компилирует проект Quartus"""
    command = f'"{quartus_sh_path}" --flow compile "{project_path}"'
    return run_command(command, "Компиляция проекта")

def find_fpga_device(quartus_pgm_path):
    """Находит подключенные FPGA устройства"""
    command = f'"{quartus_pgm_path}" -l'
    print("\n----- Поиск FPGA устройств -----")
    
    try:
        process = subprocess.run(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if process.returncode != 0:
            print("Не удалось обнаружить устройства FPGA")
            return None
        
        # Вывод результатов
        if process.stdout:
            print("\n--- НАЙДЕННЫЕ УСТРОЙСТВА ---")
            print(process.stdout)
            
            # Попытка найти USB-Blaster в выводе
            lines = process.stdout.splitlines()
            for line in lines:
                if "USB-Blaster" in line or "JTAG" in line:
                    parts = line.split()
                    if len(parts) >= 2:
                        device_id = parts[0]
                        print(f"Найдено устройство FPGA: {line}")
                        return device_id
            
        print("Устройства FPGA не найдены в выводе")
        return None
    
    except Exception as e:
        print(f"Ошибка при поиске устройств: {e}")
        return None

def program_fpga(quartus_pgm_path, sof_file, device_id=None):
    """Прошивает FPGA используя .sof файл"""
    if not device_id:
        print("Поиск устройств FPGA...")
        device_id = find_fpga_device(quartus_pgm_path)
        
    if not device_id:
        print("Не удалось найти устройство FPGA для прошивки")
        return False
    
    # Формируем команду прошивки
    command = f'"{quartus_pgm_path}" -m JTAG -c {device_id} -o "p;{sof_file}"'
    return run_command(command, "Прошивка FPGA")

def main():
    parser = argparse.ArgumentParser(description="Простой скрипт для прошивки FPGA платы")
    parser.add_argument("--quartus-dir", help="Путь к директории bin Quartus", default="/opt/intelFPGA_lite/21.1/quartus/bin")
    parser.add_argument("--project-dir", help="Путь к директории проекта Quartus", required=True)
    parser.add_argument("--project-name", help="Имя проекта (без расширения)", required=True)
    
    args = parser.parse_args()
    
    # Формируем пути
    quartus_dir = Path(args.quartus_dir)
    project_dir = Path(args.project_dir)
    
    quartus_sh = quartus_dir / "quartus_sh"
    quartus_pgm = quartus_dir / "quartus_pgm"
    project_file = project_dir / f"{args.project_name}.qpf"
    sof_file = project_dir / "output_files" / f"{args.project_name}.sof"
    
    # Проверяем наличие файлов
    if not quartus_sh.exists():
        print(f"Ошибка: quartus_sh не найден по пути {quartus_sh}")
        return 1
    
    if not quartus_pgm.exists():
        print(f"Ошибка: quartus_pgm не найден по пути {quartus_pgm}")
        return 1
    
    if not project_file.exists():
        print(f"Ошибка: файл проекта .qpf не найден по пути {project_file}")
        return 1
    
    print("=== FPGA Programmer ===")
    
    # Компиляция
    print("\nШаг 1: Компиляция проекта")
    if not compile_quartus_project(quartus_sh, project_file):
        print("Компиляция проекта не удалась. Выход.")
        return 1
    
    # Проверка наличия .sof файла после компиляции
    if not sof_file.exists():
        print(f"Ошибка: .sof файл не найден по пути {sof_file} после компиляции")
        return 1
    
    # Прошивка FPGA
    print("\nШаг 2: Прошивка FPGA")
    if not program_fpga(quartus_pgm, sof_file):
        print("Прошивка FPGA не удалась. Выход.")
        return 1
    
    print("\n=== Прошивка успешно завершена! ===")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 