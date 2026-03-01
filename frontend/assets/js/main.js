/**
 * MAIN.JS - Inicialização principal
 */

// Aguardar DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('TwitterClone iniciando...');
    
    // Inicializar aplicação
    if (typeof app !== 'undefined' && app.init) {
        app.init();
    } else {
        console.error('Aplicação não encontrada');
    }
});

// Lidar com erros não capturados
window.addEventListener('error', function(error) {
    console.error('Erro não capturado:', error);
});

// Lidar com promises rejeitadas
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise rejeitada:', event.reason);
});

// Configurar interceptadores globais
if (typeof api !== 'undefined' && api.setupInterceptors) {
    api.setupInterceptors();
}

console.log('TwitterClone carregado com sucesso!');