import pandas as pd

def convert_excel_to_csv(excel_file, csv_file):
    # Читаем Excel файл
    df = pd.read_excel(excel_file)
    # Сохраняем как CSV
    df.to_csv(csv_file, index=False)
    print(f"Converted {excel_file} to {csv_file}")

if __name__ == "__main__":
    # Конвертируем все Excel файлы
    convert_excel_to_csv("DE10_Cyclone.xlsx", "DE10_Cyclone.csv")
    convert_excel_to_csv("perif_cycl.xlsx", "perif_cycl.csv") 