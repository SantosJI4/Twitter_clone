#!/usr/bin/env python
"""
Script para criar usuários de teste para sugestões

Uso:
    python create_test_users.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'twitterclone.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import Follow

User = get_user_model()

# Lista de usuários de teste (username, first_name, last_name)
TEST_USERS = [
    ("tester1", "João", "Silva"),
    ("tester2", "Maria", "Oliveira"),
    ("tester3", "Pedro", "Santos"),
    ("tester4", "Ana", "Souza"),
    ("tester5", "Carlos", "Lima"),
]


def main():
    # Usuário principal para testar sugestões
    try:
        main_user = User.objects.get(username="admin12")
    except User.DoesNotExist:
        print("❌ Usuário 'admin12' não encontrado. Crie ou ajuste o script para outro usuário.")
        return

    created = 0
    for username, first_name, last_name in TEST_USERS:
        user, was_created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": f"{username}@example.com",
                "first_name": first_name,
                "last_name": last_name,
            },
        )
        if was_created:
            user.set_password("123456")
            user.save()
            created += 1
            print(f"✅ Usuário criado: {username} / senha: 123456")
        else:
            print(f"ℹ️ Usuário já existe: {username}")

        # Garantir que o usuário de teste NÃO esteja sendo seguido pelo main_user
        Follow.objects.filter(follower=main_user, followed=user).delete()

    print(f"\nResumo: {created} novo(s) usuário(s) criado(s).")
    print("Agora acesse o app logado como 'admin12' e verifique 'Sugestões para você'.")


if __name__ == "__main__":
    main()
