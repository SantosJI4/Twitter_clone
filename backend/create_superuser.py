#!/usr/bin/env python
"""
Script para criar superusuário automaticamente
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'twitterclone.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Verificar se superuser já existe
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        username='admin',
        email='admin@twitterclone.com',
        password='admin123',
        first_name='Admin',
        last_name='System'
    )
    print('✅ Superuser criado com sucesso!')
    print('Email: admin@twitterclone.com')
    print('Senha: admin123')
else:
    print('ℹ️ Superuser já existe.')