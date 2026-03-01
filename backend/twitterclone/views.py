from django.shortcuts import render
from django.http import HttpResponse
from django.views.generic import TemplateView
from django.conf import settings
import os

class FrontendAppView(TemplateView):
    """
    View para servir a aplicação frontend single page
    """
    def get(self, request, *args, **kwargs):
        try:
            # Caminho para o index.html do frontend
            index_path = os.path.join(settings.BASE_DIR.parent, 'frontend', 'index.html')
            
            with open(index_path, 'r', encoding='utf-8') as f:
                return HttpResponse(f.read(), content_type='text/html')
        except Exception as e:
            return HttpResponse(
                f'Erro ao carregar frontend: {str(e)}', 
                status=500
            )


def health_check(request):
    """
    Endpoint de verificação de saúde da API
    """
    return HttpResponse('OK', content_type='text/plain')


def api_status(request):
    """
    Endpoint com status da API
    """
    from django.http import JsonResponse
    return JsonResponse({
        'status': 'online',
        'message': 'TwitterClone API está funcionando!',
        'version': '1.0.0'
    })