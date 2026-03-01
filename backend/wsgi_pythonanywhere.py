#!/usr/bin/env python3

"""
WSGI config for twitterclone project for PythonAnywhere.

This is the WSGI configuration for deployment on PythonAnywhere.
"""

import os
import sys

# Adicionar o caminho do projeto
path = '/home/seuusername/twitterclone/backend'  # Substitua 'seuusername' pelo seu username
if path not in sys.path:
    sys.path.insert(0, path)

# Configurar variável de ambiente
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'twitterclone.settings')

# Para produção no PythonAnywhere, descomente a linha abaixo:
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'twitterclone.settings_production')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()