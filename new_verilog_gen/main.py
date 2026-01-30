import pandas as pd
import re
from pathlib import Path

def remove_assign_between(file_path):
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

def generate_cyclone_verilog(file_path, results):
    #user_df = pd.read_excel("User_table.xlsx")
    de10_cycl_df = pd.read_excel("DE10_Cyclone.xlsx")
    perif_cycl_df = pd.read_excel("perif_cycl.xlsx")

    per = "Perifery"
    cycl = "CycloneIV"
    de10 = "DE10-Lite"
    #Cчитывание из таблицы только содиненных пинов
    # for i in range(1,36):
    #     for j in range(1,37):
    #         row = []
    #         if(user_df[i][j]==1):
    #             row.append(user_df[i][0])
    #             row.append(user_df[0][j])
    #             results.append(row)
    # print(results)#столбец/строка
    #Из пары de10-perif в пару cycl-cycl
    for i in range(len(results)):
        for j in range(36):
            if(perif_cycl_df[per][j] == results[i][0]):
                results[i][0]=perif_cycl_df[cycl][j]
            if(de10_cycl_df[de10][j] == results[i][1]):
                results[i][1]=de10_cycl_df[cycl][j]
    remove_assign_between(file_path)
    # if(len(results)==0):
    #     return("Нет таких пинов или не правильный порядок")    

    #Запись команды в соответствии с пинами
    for i in range(len(results)):
        lst = ["\n    assign {a} = {b}\n".format(a=results[i][0], b = results[i][1])]
        insert_before_endmodule(file_path, lst)


def main():
    results = [["E","V10"]]
    file_path = "try.v"
    generate_cyclone_verilog(file_path, results)
