import pandas as pd
import os

diretorio = os.path.dirname(os.path.realpath(__file__))

def converter_xls_para_xlsx(arquivo_xls, arquivo_xlsx):
    xls = pd.ExcelFile(arquivo_xls)
    
    with pd.ExcelWriter(arquivo_xlsx, engine='openpyxl') as writer:
        for sheet_name in xls.sheet_names:
            df = xls.parse(sheet_name)
            df.to_excel(writer, sheet_name=sheet_name, index=False)

    print(f"Arquivo convertido para {arquivo_xlsx}")

for arquivo in os.listdir(diretorio):
    if arquivo.endswith('.xls'):
        arquivo_xls = os.path.join(diretorio, arquivo)
        arquivo_xlsx = os.path.join(diretorio, 'arquivo_convertido.xlsx')

        converter_xls_para_xlsx(arquivo_xls, arquivo_xlsx)
