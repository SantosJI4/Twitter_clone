#!/usr/bin/env bash
set -o errexit

# Instalar dependências
pip install -r requirements.txt

# Entrar no diretório do backend
cd backend

# Coletar arquivos estáticos (frontend + admin)
python manage.py collectstatic --noinput

# Aplicar migrations no banco de dados
python manage.py migrate
