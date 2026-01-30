import subprocess
import argparse
import sys
import os.path
from pathlib import Path

def compile_quartus_project(quartus_sh_path, quartus_qpf_path, quartus_qsf_path):
    # Формируем команду без перенаправления вывода и с корректными параметрами
    command = f'{quartus_sh_path} --flow compile "{quartus_qpf_path}" -c "{quartus_qsf_path}"'
    
    print("Проект ПЛИС компилируется")
    project_compilation_process = subprocess.run(
        command, 
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, 
        shell=True,
        text=True
    )
    print("Компиляция окончена")
    print()
    
    if project_compilation_process.returncode == 0:
        f = 1
    else:
        f = 0
    return f

def load_sof_to_fpga(port, quartus_pgm_path, quartus_sof_path):
    find_connected_fpga = subprocess.run(
        quartus_pgm_path + " -l", stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, shell=True, text=True
        )
    
    # print(find_connected_fpga.returncode) # флаг успешного выполнения команды
    # print(find_connected_fpga.stdout) # Вывод консоли
    
    
    #find_connected_fpga.stdout.split()[2]
    # port = "[1-1.5]"
    print('Найдена плата ПЛИС, порт подключения:', port)
    
    if not find_connected_fpga:
        raise IOError("Плата ПЛИС не найдена")
    
    fpga_cores = subprocess.run(
        f'{quartus_pgm_path} -c "{port}" -a', 
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, 
        shell=True, text=True
        )

    # Отделяем от всего вывода консоли информацию о подключенных устройствах
    #print(fpga_cores.stdout.split('Info')[0].split('\n'))
    fpga_n_cores = [item for item in fpga_cores.stdout.split('Info')[0].split('\n') if item != '' ]
    cores_cnt = len(fpga_n_cores) - 1
    print('Число ядер у платы ПЛИС:', cores_cnt)
    
    print('Начинается прошивка платы ПЛИС')
    if cores_cnt == 1:
        result = subprocess.run(
            f'{quartus_pgm_path} -m JTAG -c "{port}" -o "p;{quartus_sof_path}"',
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, shell=True, text=True
            )
        print("STDOUT: ", result.stdout, '\n')
        print("STDERR: ", result.stderr, '\n')
        if result.returncode == 0:
            print('Плата ПЛИС успешно прошита')
            f = 1
        else:
            print('Не удалось прошить плату ПЛИС')
            f = 0
        print()
    else:
        f = 0
        
    return f

def compile_project(project_name, project_dir, quartus_dir):
    quartus_sh = quartus_dir / "quartus_sh"
    quartus_qpf = project_dir / f"{project_name}.qpf"
    quartus_qsf = project_dir / f"{project_name}.qsf"
    if not compile_quartus_project(str(quartus_sh), str(quartus_qpf), str(quartus_qsf)):
        print("Компиляция проекта не удалась. Выход.")
        return 1
    print("\n=== Компиляция успешно завершена! ===")
    return 0

def program_fpga(port, project_name, project_dir, quartus_dir, sof_path=None):
    quartus_pgm = quartus_dir / "quartus_pgm"
    if sof_path is None:
        quartus_sof = project_dir / "output_files" / f"{project_name}.sof"
    else:
        quartus_sof = Path(sof_path)
    print("\nШаг: Прошивка FPGA")
    if not load_sof_to_fpga(port, str(quartus_pgm), str(quartus_sof)):
        print("Прошивка FPGA не удалась. Выход.")
        return 1
    print("\n=== Прошивка успешно завершена! ===")
    return 0

def program_green():
    port_green = "USB-Blaster [2-1.5]"
    project_name_green = "GreenP"
    project_dir_green = Path("/home/amur/project_2161/backend/app/data/2161_Green")
    quartus_dir = Path("/home/amur/intelFPGA_lite/20.1/quartus/bin")
    # Сначала компиляция, потом прошивка
    if compile_project(project_name_green, project_dir_green, quartus_dir) != 0:
        return 1
    return program_fpga(port_green, project_name_green, project_dir_green, quartus_dir)

def program_de10(sof_path=None):
    port_de10 = "USB-Blaster [2-1.6]"
    project_name_de10 = "De10P"
    project_dir_de10 = Path("/home/amur/project_2161/backend/app/data/2161_De10")
    quartus_dir = Path("/home/amur/intelFPGA_lite/20.1/quartus/bin")
    # Только прошивка, без компиляции
    return program_fpga(port_de10, project_name_de10, project_dir_de10, quartus_dir, sof_path=sof_path)