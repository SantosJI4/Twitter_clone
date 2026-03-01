#!/usr/bin/env python
"""
Script para criar usuários de teste com posts populares.
Idempotente: pode rodar várias vezes sem duplicar dados.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'twitterclone.settings')
django.setup()

from django.contrib.auth import get_user_model
from social.models import Post

User = get_user_model()

USERS = [
    {'username': 'maria_silva', 'first_name': 'Maria', 'last_name': 'Silva', 'email': 'maria@test.com'},
    {'username': 'joao_santos', 'first_name': 'João', 'last_name': 'Santos', 'email': 'joao@test.com'},
    {'username': 'ana_costa', 'first_name': 'Ana', 'last_name': 'Costa', 'email': 'ana@test.com'},
    {'username': 'pedro_oliveira', 'first_name': 'Pedro', 'last_name': 'Oliveira', 'email': 'pedro@test.com'},
    {'username': 'julia_lima', 'first_name': 'Julia', 'last_name': 'Lima', 'email': 'julia@test.com'},
    {'username': 'lucas_ferreira', 'first_name': 'Lucas', 'last_name': 'Ferreira', 'email': 'lucas@test.com'},
    {'username': 'camila_souza', 'first_name': 'Camila', 'last_name': 'Souza', 'email': 'camila@test.com'},
    {'username': 'rafael_pereira', 'first_name': 'Rafael', 'last_name': 'Pereira', 'email': 'rafael@test.com'},
    {'username': 'beatriz_rocha', 'first_name': 'Beatriz', 'last_name': 'Rocha', 'email': 'beatriz@test.com'},
    {'username': 'gabriel_almeida', 'first_name': 'Gabriel', 'last_name': 'Almeida', 'email': 'gabriel@test.com'},
]

POSTS = {
    'maria_silva': [
        'Bom dia! Começando o dia com muito café ☕ #bomdia #cafe',
        'Estudando Python hoje, que linguagem incrível! 🐍 #python #programacao #dev',
        'Alguém mais assistiu o novo filme? Recomendo demais! 🎬 #cinema #filme',
    ],
    'joao_santos': [
        'Treino feito! 💪 Nunca desistam dos seus objetivos #fitness #treino #saude',
        'Novo projeto no ar! Muito orgulhoso do resultado 🚀 #dev #projeto #tecnologia',
    ],
    'ana_costa': [
        'A natureza é perfeita 🌿 #natureza #paz #fotografia',
        'Receita nova testada e aprovada! 🍰 #receita #cozinha #food',
        'Livro terminado! Próximo da lista já escolhido 📚 #leitura #livros',
    ],
    'pedro_oliveira': [
        'Aquele pôr do sol incrível 🌅 #sunset #fotografia #natureza',
        'JavaScript é vida! Quem concorda? 😄 #javascript #programacao #dev',
    ],
    'julia_lima': [
        'Viagem dos sonhos realizada! ✈️ #viagem #travel #ferias',
        'Yoga pela manhã muda completamente o dia 🧘‍♀️ #yoga #bemestar #saude',
        'Gratidão por cada momento! 🙏 #gratidao #vida',
    ],
    'lucas_ferreira': [
        'Futebol com os amigos no final de semana ⚽ #futebol #amigos #esporte',
        'Deploy feito com sucesso! Sem bugs! 🎉 #dev #deploy #tecnologia',
    ],
    'camila_souza': [
        'Arte é a expressão mais pura da alma 🎨 #arte #pintura #criatividade',
        'Café e código, a combinação perfeita ☕💻 #cafe #programacao #dev',
    ],
    'rafael_pereira': [
        'Música boa para começar a semana 🎵 #musica #playlist #bomdia',
        'Aprendendo React, cada dia mais fascinado! ⚛️ #react #frontend #dev',
        'Churrasco de domingo é sagrado! 🥩🔥 #churrasco #domingo #familia',
    ],
    'beatriz_rocha': [
        'Fotografia é congelar momentos eternos 📸 #fotografia #foto #arte',
        'Meditação diária, recomendo para todos! 🧘 #meditacao #mindfulness #saude',
    ],
    'gabriel_almeida': [
        'Hackathon neste final de semana, bora codar! 💻 #hackathon #programacao #dev',
        'Pizza caseira ficou show! 🍕 #pizza #cozinha #food',
        'Corrida matinal de 10km concluída! 🏃‍♂️ #corrida #esporte #saude',
    ],
}


def main():
    created_users = 0
    created_posts = 0

    for data in USERS:
        user, created = User.objects.get_or_create(
            username=data['username'],
            defaults={
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'email': data['email'],
            }
        )
        if created:
            user.set_password('Teste123!')
            user.save()
            created_users += 1
            print(f'  + Usuario criado: {data["username"]}')

            for content in POSTS.get(data['username'], []):
                Post.objects.create(author=user, content=content)
                created_posts += 1
        else:
            print(f'  = Usuario ja existe: {data["username"]}')

    print(f'\nResumo: {created_users} usuarios criados, {created_posts} posts criados')


if __name__ == '__main__':
    print('Criando usuarios e posts de teste...')
    main()
    print('Concluido!')
