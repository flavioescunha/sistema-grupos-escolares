@echo off
cd /d "%~dp0"

echo ==========================================
echo ATUALIZANDO REPOSITORIO GIT
echo Pasta atual:
cd
echo ==========================================
echo.

echo Verificando status...
git status
echo.

set /p MSG=Digite a mensagem do commit: 
if "%MSG%"=="" set MSG=Atualizacao

echo.
echo Adicionando arquivos alterados...
git add .

echo.
echo Criando commit...
git commit -m "%MSG%"

echo.
echo Enviando para o GitHub...
git push origin main

echo.
echo ==========================================
echo FINALIZADO.
echo ==========================================
pause