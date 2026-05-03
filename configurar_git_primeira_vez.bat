@echo off
cd /d "%~dp0"

echo ==========================================
echo CONFIGURANDO REPOSITORIO GIT PELA PRIMEIRA VEZ
echo Pasta atual:
cd
echo ==========================================
echo.

echo Verificando se o Git esta instalado...
git --version
if errorlevel 1 (
    echo.
    echo ERRO: Git nao encontrado.
    echo Instale o Git antes de continuar:
    echo https://git-scm.com/downloads
    echo.
    pause
    exit /b
)

echo.
set /p REPO=Digite a URL do repositorio GitHub: 

if "%REPO%"=="" (
    echo.
    echo ERRO: Voce precisa informar a URL do repositorio.
    pause
    exit /b
)

echo.
echo Inicializando Git...
git init

echo.
echo Definindo branch principal como main...
git branch -M main

echo.
echo Adicionando arquivos...
git add .

echo.
set /p MSG=Digite a mensagem do primeiro commit: 
if "%MSG%"=="" set MSG=Primeira versao do sistema de grupos escolares

echo.
echo Criando commit...
git commit -m "%MSG%"

echo.
echo Adicionando repositorio remoto...
git remote remove origin 2>nul
git remote add origin "%REPO%"

echo.
echo Enviando para o GitHub...
git push -u origin main

echo.
echo ==========================================
echo CONFIGURACAO FINALIZADA.
echo ==========================================
echo.
pause