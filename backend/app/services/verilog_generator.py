import pandas as pd
import re
from pathlib import Path
from app.config.quartus_config import DATA_FILES

def remove_assign_between(file_path):
    """Удаляет все assign операторы из файла"""
    text = Path(file_path).read_text(encoding="utf-8")
    # Разбиваем на три части: до ");", сам блок между и от "endmodule" до конца
    m = re.match(r'(.*\);\s*)(.*?)(\s*endmodule.*)', text, flags=re.S)
    if not m:
        print("Не удалось найти участок `); ... endmodule`")
        return
    head, middle, tail = m.groups()

    # Фильтруем: убираем строки assign и пустые строки
    filtered_lines = []
    for line in middle.splitlines(keepends=False):
        # пропускаем пустые или содержащие только пробелы
        if not line.strip():
            continue
        # пропускаем строки assign
        if re.match(r'\s*assign\b', line):
            continue
        filtered_lines.append(line)

    # Собираем результат: head, затем отфильтрованные строки, затем tail
    new_text = head.rstrip() + "\n"
    if filtered_lines:
        # добавляем каждую строку с переносом
        new_text += "\n".join(filtered_lines).rstrip() + "\n"
    new_text += tail.lstrip()

    Path(file_path).write_text(new_text, encoding="utf-8")

def insert_before_endmodule(file_path, insert_lines):
    """
    Вставляет строки перед endmodule в файле
    
    Args:
        file_path: путь к .v‑файлу (строка или Path)
        insert_lines: список строк, которые нужно вставить (каждая с '\n' на конце)
    """
    p = Path(file_path)
    lines = p.read_text(encoding="utf-8").splitlines(keepends=True)

    # Находим индекс последнего вхождения 'endmodule'
    idx = None
    for i, line in enumerate(lines):
        if line.strip().lower() == "endmodule":
            idx = i
    if idx is None:
        raise ValueError("В файле не найдена строка 'endmodule'")

    # Вставляем перед этой строкой
    new_lines = lines[:idx] + insert_lines + lines[idx:]
    # Записываем обратно
    p.write_text("".join(new_lines), encoding="utf-8")

def generate_verilog(connections):
    """
    Генерирует Verilog код на основе конфигурации соединений.
    
    Args:
        connections (list): Список пар соединений в формате [['left_pin', 'right_pin'], ...]
        где left_pin - это Perifery, right_pin - это DE10-Lite
    
    Returns:
        str: Сгенерированный Verilog код
    """
    try:
        # Проверяем существование файлов
        if not Path(DATA_FILES['de10lite']).exists():
            raise FileNotFoundError(f"Файл {DATA_FILES['de10lite']} не найден")
        if not Path(DATA_FILES['perif']).exists():
            raise FileNotFoundError(f"Файл {DATA_FILES['perif']} не найден")
        if not Path(DATA_FILES['green_v']).exists():
            raise FileNotFoundError(f"Файл {DATA_FILES['green_v']} не найден")

        # Читаем CSV файлы
        de10_df = pd.read_csv(DATA_FILES['de10lite'])
        perif_df = pd.read_csv(DATA_FILES['perif'])

        # Создаем словари для быстрого поиска
        de10_dict = dict(zip(de10_df['DE10-Lite'], de10_df['CycloneIV']))
        perif_dict = dict(zip(perif_df['Perifery'], perif_df['CycloneIV']))

        # Преобразуем соединения в нужный формат
        results = []
        for left, right in connections:
            if left in de10_dict and right in perif_dict:
                results.append([de10_dict[left], perif_dict[right]])
            else:
                print(f"Warning: Pin pair not found - {left} -> {right}")

        # Очищаем существующие assign
        remove_assign_between(DATA_FILES['green_v'])

        # Добавляем новые assign
        for left, right in results:
            lst = ["\n    assign {a} = {b};\n".format(a=right, b=left)]
            insert_before_endmodule(DATA_FILES['green_v'], lst)

        # Читаем и возвращаем сгенерированный код
        return Path(DATA_FILES['green_v']).read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error in generate_verilog: {e}")
        raise
