const goLiveReadiness = {
  title: 'Go-live interno controlado',
  subtitle:
    'Checklist pratico para liberar o EloSystem com RH 1, RH 2 e CEO sem abrir escopo novo.',
  pilotUsers: [
    {
      role: 'RH 1',
      focus: 'Operacao diaria de pessoas, documentos, jornada e folha.',
      firstActions: [
        'Entrar no sistema e validar acesso ao menu Pessoas, Compliance, Jornada e DP.',
        'Cadastrar ou revisar um colaborador real de teste.',
        'Anexar um documento e confirmar se o arquivo abre corretamente.',
        'Importar um arquivo pequeno de jornada e revisar pendencias.',
      ],
    },
    {
      role: 'RH 2',
      focus: 'Conferencia operacional, segunda validacao e apoio ao DP.',
      firstActions: [
        'Revisar permissao de acesso e visibilidade dos modulos sensiveis.',
        'Conferir banco de horas e sincronizacao Jornada -> Folha em competencia de teste.',
        'Gerar preview de holerite e PDF oficial.',
        'Registrar feedback de qualquer etapa confusa.',
      ],
    },
    {
      role: 'CEO',
      focus: 'Acompanhamento executivo, relatorios e auditoria.',
      firstActions: [
        'Acessar Dashboard e validar leitura dos indicadores principais.',
        'Gerar preview de relatorio executivo por periodo.',
        'Consultar Central de Auditoria com filtros por usuario e modulo.',
        'Registrar sugestoes de clareza para leitura executiva.',
      ],
    },
  ],
  checklists: [
    {
      key: 'environment',
      title: 'Ambiente',
      items: [
        'Frontend publicado e carregando sem erro visual critico.',
        'Backend online e health check respondendo.',
        'Banco conectado e Prisma gerado no ambiente correto.',
        'Variaveis de ambiente conferidas para API, storage e JWT.',
        'Uploads, PDFs e storage corporativo testados com arquivo pequeno.',
      ],
    },
    {
      key: 'operation',
      title: 'Operacao RH/DP',
      items: [
        'Login e logout validados com usuario RH.',
        'Criacao de usuario, perfil e permissao revisadas.',
        'Cadastro de colaborador e upload documental testados.',
        'Importacao de jornada, banco de horas e sincronizacao com folha conferidos.',
        'Competencia de folha processada, holerite visualizado e PDF gerado.',
      ],
    },
    {
      key: 'executive',
      title: 'Acompanhamento CEO',
      items: [
        'Dashboard carregando indicadores principais.',
        'Relatorios com preview, Excel e PDF funcionando por periodo.',
        'Auditoria exibindo acoes recentes e filtros relevantes.',
        'Central de Ajuda acessivel para leitura rapida dos fluxos.',
      ],
    },
    {
      key: 'monitoring',
      title: 'Pos-go-live',
      items: [
        'Acompanhar auditoria no primeiro dia de uso.',
        'Registrar feedbacks pelo assistente Elo com contexto da pagina.',
        'Priorizar bugs que bloqueiem RH ou leitura executiva.',
        'Separar sugestoes de melhoria de problemas operacionais reais.',
      ],
    },
  ],
  usefulReports: [
    'Usuarios ativos e ultimo acesso',
    'Acoes recentes na auditoria',
    'Documentos enviados no periodo',
    'Importacoes recentes de jornada',
    'Competencias processadas ou reabertas',
    'Falhas recentes de sincronizacao/storage',
  ],
};

export default goLiveReadiness;
