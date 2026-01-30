import subprocess
import argparse
import sys
import os.path
from pathlib import Path

def compile_quartus_project(quartus_sh_path, quartus_qpf_path, quartus_qsf_path):
    compile_report_path = 'compile_report_path.txt'
    
    command = f'{quartus_sh_path} --flow compile <{quartus_qpf_path}> [-c {quartus_qsf_path}] >{compile_report_path}'
    
    print("Проект ПЛИС компилируется")
    project_compilation_process = subprocess.run(
        command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                 stderr=subprocess.PIPE, shell=True
        )
    #print(project_compilation_process.stdout, '\n')
    #print(project_compilation_process, '\n')
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
    
    print(find_connected_fpga.returncode) # флаг успешного выполнения команды
    print(find_connected_fpga.stdout) # Вывод консоли
    
    
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
            f'sudo {quartus_pgm_path} -m JTAG -c "{port}" -o "p;{quartus_sof_path}"',
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


def program_and_compile(port, project_name, project_dir, quartus_dir):
    # parser = argparse.ArgumentParser(description="Утилита прошивки FPGA платы через Quartus CLI")
    # parser.add_argument("--quartus-dir", help="Путь к директории bin Quartus", default="/opt/intelFPGA_lite/21.1/quartus/bin")
    # parser.add_argument("--project-dir", help="Путь к директории проекта Quartus", required=True)
    # parser.add_argument("--project-name", help="Имя проекта (без расширения)", required=True)
    
    # args = parser.parse_args()
    
    # Формируем пути
    # quartus_dir = Path(args.quartus_dir)
    # project_dir = Path(args.project_dir)
    quartus_sh = quartus_dir / "quartus_sh"
    quartus_pgm = quartus_dir / "quartus_pgm"
    quartus_qpf = project_dir / f"{project_name}.qpf"
    quartus_qsf = project_dir / f"{project_name}.qsf"
    quartus_sof = project_dir / "output_files" / f"{project_name}.sof"
    
    # Проверяем наличие файлов
    if not quartus_sh.exists():
        print(f"Ошибка: quartus_sh не найден по пути {quartus_sh}")
        return 1
    
    if not quartus_pgm.exists():
        print(f"Ошибка: quartus_pgm не найден по пути {quartus_pgm}")
        return 1
    
    if not quartus_qpf.exists():
        print(f"Ошибка: файл проекта .qpf не найден по пути {quartus_qpf}")
        return 1
    
    print("=== FPGA Programmer ===")
    
    # Компиляция
    if True:
        print("\nШаг 1: Компиляция проекта")
        if not compile_quartus_project(str(quartus_sh), str(quartus_qpf), str(quartus_qsf)):
            print("Компиляция проекта не удалась. Выход.")
            return 1
    
    # Прошивка FPGA
    print("\nШаг 2: Прошивка FPGA")
    if not load_sof_to_fpga(port, str(quartus_pgm), str(quartus_sof)):
        print("Прошивка FPGA не удалась. Выход.")
        return 1
    print("\n=== Прошивка успешно завершена! ===")
    return 0

def main():
    port_green = "USB-Blaster [2-1.5]"
    port_de10 = "USB-Blaster [2-1.6]"
    project_name_green = "GreenP"
    project_name_de10 = "De10P"
    quartus_dir = Path("/home/amur/intelFPGA_lite/20.1/quartus/bin")
    project_dir_green = Path("/home/amur/2161_Green")
    project_dir_de10 = Path("/home/amur/2161_De10")
    program_and_compile(port_green, project_name_green, project_dir_green, quartus_dir)
    program_and_compile(port_de10, project_name_de10, project_dir_de10, quartus_dir)


if __name__ == "__main__":
    sys.exit(main())

