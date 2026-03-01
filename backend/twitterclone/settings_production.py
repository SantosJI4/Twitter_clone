# Configurações de produção para PythonAnywhere
import os
from .settings import *

# Security settings
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY', 'seu-secret-key-super-seguro-aqui-para-producao')

# Hosts permitidos - adicione seu domínio do PythonAnywhere
ALLOWED_HOSTS = [
    'seuusername.pythonanywhere.com',  # Substitua pelo seu username
    'localhost',
    '127.0.0.1'
]

# Database para PythonAnywhere
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': f'{os.environ.get("PYTHONANYWHERE_USERNAME", "usuario")}_twitterclone',
        'USER': os.environ.get('PYTHONANYWHERE_USERNAME', 'usuario'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': f'{os.environ.get("PYTHONANYWHERE_USERNAME", "usuario")}.mysql.pythonanywhere-services.com',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# CORS para produção
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    f'https://{os.environ.get("PYTHONANYWHERE_USERNAME", "usuario")}.pythonanywhere.com',
]

# Static files para produção
STATIC_URL = '/static/'
STATIC_ROOT = '/home/{}/twitterclone/backend/staticfiles/'.format(
    os.environ.get('PYTHONANYWHERE_USERNAME', 'usuario')
)

MEDIA_URL = '/media/'
MEDIA_ROOT = '/home/{}/twitterclone/backend/media/'.format(
    os.environ.get('PYTHONANYWHERE_USERNAME', 'usuario')
)

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Email para produção (configure conforme necessário)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'