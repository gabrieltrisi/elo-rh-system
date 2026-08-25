const helpSections = [
  {
    key: 'administracao',
    title: 'Administracao',
    description:
      'Governanca do sistema, seguranca, acessos, auditoria, integracoes e parametros administrativos.',
    modules: [
      {
        page: 'users',
        title: 'Usuarios',
        audience: 'Administracao do sistema e RH autorizado',
        summary:
          'Gerencie contas de acesso sem misturar usuario do sistema com cadastro de colaborador.',
        objective:
          'Criar, editar, ativar, bloquear e vincular contas de acesso aos colaboradores quando necessario.',
        whenToUse:
          'Use quando alguem precisar acessar o EloSystem, mudar perfil, recuperar acesso ou ser inativado.',
        steps: [
          'Abra Usuarios e revise os indicadores do topo.',
          'Use busca e filtros para localizar a conta.',
          'Crie um novo usuario informando nome, email, perfil e status.',
          'Vincule um colaborador somente quando a conta representar uma pessoa cadastrada no RH.',
          'Revise status e obrigatoriedade de troca de senha antes de salvar.',
        ],
        bestPractices: [
          'Prefira inativar ou bloquear em vez de excluir acesso.',
          'Use o menor perfil suficiente para a funcao da pessoa.',
          'Revise usuarios sem ultimo acesso periodicamente.',
        ],
        commonMistakes: [
          'Criar usuario como se fosse colaborador.',
          'Manter usuario ativo depois de desligamento.',
          'Atribuir perfil administrativo para consultas simples.',
        ],
        faq: [
          {
            question: 'Todo colaborador precisa ser usuario?',
            answer:
              'Nao. Colaborador e cadastro de RH. Usuario e conta de acesso. O vinculo e opcional.',
          },
          {
            question: 'Usuario bloqueado acessa o sistema?',
            answer:
              'Nao. Status inativo ou bloqueado deve impedir acesso ao EloSystem.',
          },
        ],
        keywords: ['acesso', 'login', 'senha', 'perfil', 'usuario'],
      },
      {
        page: 'rolesPermissions',
        title: 'Perfis e Permissoes',
        audience: 'Administracao do sistema',
        summary:
          'Controle quais perfis podem ler, criar, alterar ou operar cada modulo do EloSystem.',
        objective:
          'Manter a autorizacao centralizada, segura e pronta para crescimento por modulo e acao.',
        whenToUse:
          'Use ao criar um novo perfil, ajustar permissao ou auditar acesso de uma area.',
        steps: [
          'Escolha um perfil existente ou crie um perfil novo.',
          'Revise as permissoes por modulo e por acao.',
          'Evite liberar permissoes sensiveis sem necessidade real.',
          'Salve a alteracao e valide com um usuario de teste, se possivel.',
        ],
        bestPractices: [
          'Mantenha perfis de sistema protegidos contra alteracoes destrutivas.',
          'Use perfis personalizados para excecoes recorrentes.',
          'Revise permissoes sensiveis de folha, auditoria e usuarios.',
        ],
        commonMistakes: [
          'Liberar permissao de escrita quando a pessoa so precisa consultar.',
          'Alterar perfil de sistema sem validar impacto.',
          'Confiar apenas na interface; a protecao real deve estar no backend.',
        ],
        faq: [
          {
            question: 'Perfil e permissao sao a mesma coisa?',
            answer:
              'Nao. Perfil agrupa permissoes. Permissao representa uma acao autorizada em um modulo.',
          },
        ],
        keywords: ['perfil', 'permissao', 'acesso', 'role', 'seguranca'],
      },
      {
        page: 'audit',
        title: 'Central de Auditoria',
        audience: 'Administracao, RH e diretoria autorizada',
        summary:
          'Acompanhe a trilha de acoes importantes feitas no sistema, com usuario, modulo, entidade e contexto.',
        objective:
          'Dar rastreabilidade para acoes sensiveis, exportacoes, alteracoes administrativas e operacoes criticas.',
        whenToUse:
          'Use para investigar mudancas, conferir operacoes sensiveis ou apoiar governanca interna.',
        steps: [
          'Defina um periodo para a analise.',
          'Filtre por usuario, modulo, acao ou severidade.',
          'Abra o detalhe do evento para ver contexto, antes e depois quando disponivel.',
          'Use a leitura cronologica para entender a sequencia dos acontecimentos.',
        ],
        bestPractices: [
          'Investigue eventos criticos no mesmo dia.',
          'Use filtros para nao analisar ruido desnecessario.',
          'Relacione auditoria com documentos, folha e usuarios quando houver suspeita.',
        ],
        commonMistakes: [
          'Ler eventos fora de contexto.',
          'Ignorar falhas de permissao repetidas.',
          'Nao filtrar por periodo antes de analisar grandes volumes.',
        ],
        faq: [
          {
            question: 'A auditoria substitui backup?',
            answer:
              'Nao. Auditoria explica quem fez o que. Backup recupera dados. Os dois se complementam.',
          },
        ],
        keywords: ['auditoria', 'log', 'rastreabilidade', 'evento', 'seguranca'],
      },
      {
        page: 'integrations',
        title: 'Integracoes',
        audience: 'Administracao e suporte tecnico',
        summary:
          'Hub para acompanhar conexoes externas como SharePoint, OneDrive, MyAhgora/TOTVS, email e APIs futuras.',
        objective:
          'Centralizar configuracoes seguras, status de conexao e historico basico de sincronizacoes.',
        whenToUse:
          'Use para revisar prontidao de integracoes, logs de sincronizacao e parametros administrativos seguros.',
        steps: [
          'Abra a integracao desejada.',
          'Revise status, ultima sincronizacao e logs recentes.',
          'Atualize apenas parametros administrativos visiveis.',
          'Use teste de conexao quando disponivel.',
        ],
        bestPractices: [
          'Nunca exponha tokens ou segredos no frontend.',
          'Registre falhas recorrentes para suporte.',
          'Mantenha root folders e providers documentados.',
        ],
        commonMistakes: [
          'Confundir configuracao de integracao com parametrizacao do sistema.',
          'Alterar provider ativo sem validar impacto em documentos.',
        ],
        faq: [
          {
            question: 'A integracao monitora OneDrive pessoal?',
            answer:
              'Nao. O foco e apenas o que passa pelo EloSystem e pelos repositorios corporativos configurados.',
          },
        ],
        keywords: ['sharepoint', 'onedrive', 'totvs', 'myahgora', 'email'],
      },
      {
        page: 'settings',
        title: 'Configuracoes',
        audience: 'Administracao do sistema',
        summary:
          'Painel mestre para parametros de empresa, unidades, documentos, jornada, folha, seguranca e preferencias.',
        objective:
          'Concentrar parametros administrativos para que os modulos evoluam de forma consistente.',
        whenToUse:
          'Use ao configurar dados institucionais, regras padrao ou parametros que afetam varios modulos.',
        steps: [
          'Escolha a categoria de configuracao.',
          'Revise os campos antes de alterar parametros sensiveis.',
          'Salve alteracoes pequenas e valide o impacto no modulo relacionado.',
        ],
        bestPractices: [
          'Documente mudancas de parametros sensiveis.',
          'Restrinja acesso a configuracoes de seguranca e folha.',
          'Evite alterar regras padrao durante fechamento de folha.',
        ],
        commonMistakes: [
          'Mudar regra global sem alinhar com RH/DP.',
          'Usar configuracoes para contornar falta de permissao.',
        ],
        faq: [
          {
            question: 'Configuracoes e Integracoes sao a mesma area?',
            answer:
              'Nao. Configuracoes controla parametros internos. Integracoes controla conexoes externas.',
          },
        ],
        keywords: ['parametros', 'empresa', 'seguranca', 'notificacoes'],
      },
    ],
  },
  {
    key: 'pessoas',
    title: 'Pessoas',
    description:
      'Operacao de RH ligada ao ciclo do colaborador, da entrada ao acompanhamento interno.',
    modules: [
      {
        page: 'employees',
        title: 'Colaboradores',
        audience: 'RH',
        summary:
          'Cadastro central de pessoas colaboradoras, separado de contas de acesso ao sistema.',
        objective:
          'Manter dados pessoais, vinculos por empresa e informacoes operacionais do colaborador.',
        whenToUse:
          'Use para cadastrar, consultar, editar e acompanhar dados do colaborador no ciclo de RH.',
        steps: [
          'Cadastre os dados principais da pessoa.',
          'Revise vinculos com empresa, cargo, departamento e status.',
          'Complete informacoes complementares e documentos quando necessario.',
          'Salve e revise o cadastro antes de usar em outros modulos.',
        ],
        bestPractices: [
          'Separe dados globais da pessoa dos dados por empresa.',
          'Mantenha status sempre atualizado.',
          'Revise duplicidades por CPF antes de cadastrar.',
        ],
        commonMistakes: [
          'Criar colaborador duplicado em vez de vincular a outra empresa.',
          'Usar colaborador como conta de login.',
          'Deixar cargo ou departamento antigo no vinculo operacional.',
        ],
        faq: [
          {
            question: 'Um colaborador pode atuar em duas empresas?',
            answer:
              'Sim. O cadastro global permanece unico e os dados operacionais ficam por vinculo.',
          },
        ],
        keywords: ['colaborador', 'cpf', 'empresa', 'cadastro', 'rh'],
      },
      {
        page: 'preadmission',
        title: 'Pre-Admissao',
        audience: 'RH',
        summary:
          'Organize candidatos aprovados antes da admissao formal, com documentos, status e comunicacao.',
        objective:
          'Reduzir pendencias antes da entrada e manter controle do processo pre-admissional.',
        whenToUse:
          'Use quando uma pessoa foi aprovada e ainda precisa enviar dados ou documentos para admissao.',
        steps: [
          'Cadastre o candidato ou pre-admissao.',
          'Informe vaga, contrato e dados iniciais.',
          'Envie link ou solicite documentos.',
          'Acompanhe status e pendencias ate a conclusao.',
        ],
        bestPractices: [
          'Confira telefone e email antes de enviar link.',
          'Revise pendencias diariamente em periodos de admissao.',
          'Mantenha observacoes claras para o time de RH.',
        ],
        commonMistakes: [
          'Enviar solicitacao com contato incompleto.',
          'Transformar pre-admissao em colaborador antes de validar documentos.',
        ],
        faq: [
          {
            question: 'Pre-admissao vira colaborador automaticamente?',
            answer:
              'A estrutura prepara essa transicao, mas a confirmacao deve respeitar o fluxo interno.',
          },
        ],
        keywords: ['pre-admissao', 'admissao', 'candidato', 'documentos'],
      },
      {
        page: 'onboarding',
        title: 'Integracao (Onboarding)',
        audience: 'RH e gestores',
        summary:
          'Acompanhe a entrada do colaborador com etapas como boas-vindas, acessos, documentos e fardamento.',
        objective:
          'Garantir que a chegada da pessoa seja organizada, rastreavel e sem esquecimentos operacionais.',
        whenToUse:
          'Use nos primeiros dias do colaborador ou quando houver pendencias de integracao.',
        steps: [
          'Abra o onboarding do colaborador.',
          'Revise etapas pendentes e responsaveis.',
          'Registre entregas, acessos e orientacoes concluidas.',
          'Acompanhe percentual de conclusao ate finalizar.',
        ],
        bestPractices: [
          'Priorize acessos e boas-vindas antes do primeiro dia.',
          'Use observacoes para pendencias que dependem de outra area.',
          'Revise colaboradores sem onboarding completo semanalmente.',
        ],
        commonMistakes: [
          'Marcar etapa como concluida sem evidencia.',
          'Deixar onboarding sem responsavel claro.',
        ],
        faq: [
          {
            question: 'Onboarding e o mesmo que pre-admissao?',
            answer:
              'Nao. Pre-admissao prepara a entrada. Onboarding acompanha a integracao apos a entrada.',
          },
        ],
        keywords: ['onboarding', 'integracao', 'boas-vindas', 'acessos'],
      },
      {
        page: 'stock',
        title: 'Fardamento',
        audience: 'RH e operacao',
        summary:
          'Controle entregas, estoque e historico de fardamento por colaborador.',
        objective:
          'Evitar perdas, faltas de estoque e entregas sem rastreabilidade.',
        whenToUse:
          'Use ao registrar entrada de estoque, entrega, devolucao ou necessidade de reposicao.',
        steps: [
          'Revise o estoque disponivel.',
          'Selecione colaborador e item entregue.',
          'Registre tamanho, quantidade e observacao.',
          'Acompanhe itens com baixo estoque.',
        ],
        bestPractices: [
          'Registre entrega no mesmo dia.',
          'Padronize tamanhos e categorias.',
          'Monitore estoque critico antes de novas admissoes.',
        ],
        commonMistakes: [
          'Entregar item sem baixar estoque.',
          'Nao registrar devolucao ou troca.',
        ],
        faq: [
          {
            question: 'Fardamento deve ficar em Pessoas?',
            answer:
              'Sim. Ele faz parte da operacao do ciclo do colaborador.',
          },
        ],
        keywords: ['fardamento', 'estoque', 'uniforme', 'entrega'],
      },
    ],
  },
  {
    key: 'compliance',
    title: 'Compliance',
    description:
      'Documentos, ocorrencias, controles formais e pendencias que exigem rastreabilidade.',
    modules: [
      {
        page: 'documents',
        title: 'Documentos / Arquivos',
        audience: 'RH',
        summary:
          'Centralize arquivos por colaborador, categoria, validade e modulo de origem.',
        objective:
          'Manter documentacao acessivel, rastreavel e pronta para auditoria interna.',
        whenToUse:
          'Use para anexar, visualizar, baixar ou acompanhar documentos e pendencias documentais.',
        steps: [
          'Selecione ou localize o colaborador.',
          'Escolha o tipo e categoria do documento.',
          'Faca upload do arquivo.',
          'Informe validade e observacoes quando aplicavel.',
          'Salve e confirme se o arquivo abre pela rota correta.',
        ],
        bestPractices: [
          'Use nomes claros para arquivos.',
          'Preencha validade quando o documento expira.',
          'Evite anexar documentos fora da categoria correta.',
        ],
        commonMistakes: [
          'Enviar arquivo sem colaborador quando deveria estar vinculado.',
          'Nao revisar se o PDF abre apos o upload.',
          'Duplicar documento vencido sem substituir ou arquivar.',
        ],
        faq: [
          {
            question: 'Posso anexar DOCX?',
            answer:
              'Sim, mas a visualizacao pode abrir como download conforme o tipo do arquivo.',
          },
        ],
        keywords: ['documentos', 'arquivo', 'upload', 'pdf', 'validade'],
      },
      {
        page: 'certificates',
        title: 'Atestados',
        audience: 'RH',
        summary:
          'Registre atestados e documentos medicos com status, arquivo e contexto operacional.',
        objective:
          'Controlar afastamentos curtos, comprovantes e pendencias de validacao.',
        whenToUse:
          'Use quando o colaborador apresentar atestado ou comprovante medico.',
        steps: [
          'Selecione o colaborador.',
          'Informe periodo, motivo e status.',
          'Anexe o documento quando houver.',
          'Revise impacto em ocorrencias e jornada.',
        ],
        bestPractices: [
          'Mantenha status atualizado.',
          'Anexe o arquivo original sempre que possivel.',
          'Revise casos recorrentes no dashboard de risco.',
        ],
        commonMistakes: [
          'Registrar atestado sem data.',
          'Nao anexar comprovante quando exigido.',
        ],
        faq: [
          {
            question: 'Atestado entra em risco operacional?',
            answer:
              'Pode compor indicadores quando recorrente ou pendente de validacao.',
          },
        ],
        keywords: ['atestado', 'saude', 'documento medico', 'pendencia'],
      },
      {
        page: 'warnings',
        title: 'Advertencias',
        audience: 'RH e gestores autorizados',
        summary:
          'Registre advertencias formais com documento, motivo, historico e impacto de risco.',
        objective:
          'Garantir formalizacao e rastreabilidade em ocorrencias disciplinares.',
        whenToUse:
          'Use quando houver uma advertencia formal a registrar e acompanhar.',
        steps: [
          'Selecione o colaborador.',
          'Descreva o motivo e data da ocorrencia.',
          'Anexe documento se houver.',
          'Revise historico antes de salvar.',
        ],
        bestPractices: [
          'Use texto objetivo e profissional.',
          'Evite detalhes pessoais desnecessarios.',
          'Consulte historico antes de nova medida.',
        ],
        commonMistakes: [
          'Registrar advertencia sem contexto minimo.',
          'Usar campo de observacao como julgamento informal.',
        ],
        faq: [
          {
            question: 'Advertencia aparece no dashboard?',
            answer:
              'Sim, pode alimentar indicadores e previsao de risco.',
          },
        ],
        keywords: ['advertencia', 'ocorrencia', 'disciplina', 'risco'],
      },
      {
        page: 'suspensions',
        title: 'Suspensoes',
        audience: 'RH e gestores autorizados',
        summary:
          'Controle suspensoes formais com periodo, colaborador, motivo e documento relacionado.',
        objective:
          'Manter registro formal e seguro de suspensoes e seus impactos operacionais.',
        whenToUse:
          'Use quando uma suspensao for definida e precisar ser documentada.',
        steps: [
          'Selecione colaborador e periodo.',
          'Informe motivo e observacoes profissionais.',
          'Anexe documento formal quando houver.',
          'Revise impacto em jornada e folha futuramente.',
        ],
        bestPractices: [
          'Valide datas antes de salvar.',
          'Mantenha documento formal vinculado.',
          'Restrinja acesso ao modulo.',
        ],
        commonMistakes: [
          'Confundir suspensao com afastamento.',
          'Registrar periodo incompleto.',
        ],
        faq: [
          {
            question: 'Suspensao deve afetar folha automaticamente?',
            answer:
              'A estrutura prepara essa integracao, mas a regra de folha deve ser validada pelo DP.',
          },
        ],
        keywords: ['suspensao', 'ocorrencia', 'periodo', 'dp'],
      },
      {
        page: 'leave',
        title: 'Afastamentos',
        audience: 'RH',
        summary:
          'Controle afastamentos ativos e historicos com periodo, motivo e status operacional.',
        objective:
          'Dar visibilidade sobre indisponibilidade, retorno previsto e impacto na operacao.',
        whenToUse:
          'Use para licencas, afastamentos formais ou indisponibilidades relevantes.',
        steps: [
          'Selecione o colaborador.',
          'Informe inicio, previsao de retorno e motivo.',
          'Atualize status durante o acompanhamento.',
          'Registre retorno quando finalizado.',
        ],
        bestPractices: [
          'Acompanhe afastamentos ativos no dashboard.',
          'Revise retorno previsto antes do vencimento.',
          'Mantenha documentacao vinculada.',
        ],
        commonMistakes: [
          'Deixar afastamento ativo apos retorno.',
          'Cadastrar afastamento sem previsao ou observacao.',
        ],
        faq: [
          {
            question: 'Afastamento e igual a ferias?',
            answer:
              'Nao. Ferias e planejamento. Afastamento representa indisponibilidade por outra natureza.',
          },
        ],
        keywords: ['afastamento', 'licenca', 'retorno', 'status'],
      },
    ],
  },
  {
    key: 'jornada',
    title: 'Jornada',
    description:
      'Ponto, horas trabalhadas, importacoes do MyAhgora/TOTVS e banco de horas.',
    modules: [
      {
        page: 'timesheet',
        title: 'Folha de Ponto',
        audience: 'RH e Departamento Pessoal',
        summary:
          'Importe relatorios do MyAhgora/TOTVS, valide dados e consolide ponto por colaborador e periodo.',
        objective:
          'Transformar arquivos de ponto em informacao confiavel para conferencia e futura integracao com folha.',
        whenToUse:
          'Use sempre que houver um arquivo de ponto exportado para importar, validar e consolidar.',
        steps: [
          'Clique em Importar relatorio.',
          'Envie CSV ou XLSX exportado do MyAhgora/TOTVS.',
          'Revise colunas detectadas e preview da importacao.',
          'Confira linhas validas, invalidas e pendencias de vinculo.',
          'Confirme a importacao para consolidar a folha de ponto.',
        ],
        bestPractices: [
          'Importe um periodo por vez.',
          'Resolva pendencias de vinculo antes de usar dados em folha.',
          'Confira horas extras e faltas depois da importacao.',
        ],
        commonMistakes: [
          'Importar arquivo com layout diferente sem revisar preview.',
          'Ignorar colaboradores nao reconhecidos.',
          'Importar o mesmo periodo varias vezes sem conferir duplicidade.',
        ],
        faq: [
          {
            question: 'Qual arquivo posso importar?',
            answer:
              'Nesta fase, CSV e XLSX sao os formatos principais. TXT/AFD fica preparado para evolucao.',
          },
          {
            question: 'Como o colaborador e reconhecido?',
            answer:
              'A prioridade e matricula/codigo, depois CPF e por ultimo nome.',
          },
        ],
        keywords: ['ponto', 'myahgora', 'totvs', 'importar', 'xlsx', 'csv'],
      },
      {
        page: 'bankHours',
        title: 'Banco de Horas',
        audience: 'RH e Departamento Pessoal',
        summary:
          'Acompanhe creditos, debitos e saldo de banco de horas com base nos dados importados da jornada.',
        objective:
          'Dar visibilidade gerencial sobre saldos e preparar integracao futura com folha.',
        whenToUse:
          'Use apos importacoes de ponto para conferir saldo por colaborador e periodo.',
        steps: [
          'Escolha o periodo de referencia.',
          'Filtre por colaborador ou departamento se necessario.',
          'Revise creditos, debitos e saldo atual.',
          'Identifique saldos que precisam de validacao.',
        ],
        bestPractices: [
          'Analise banco de horas junto com folha de ponto.',
          'Investigue saldos altos antes do fechamento mensal.',
          'Mantenha criterios de compensacao alinhados com a empresa.',
        ],
        commonMistakes: [
          'Usar saldo sem validar a importacao de origem.',
          'Confundir horas extras pagas com saldo compensavel.',
        ],
        faq: [
          {
            question: 'Banco de horas ja gera evento de folha?',
            answer:
              'Nesta fase ele consolida a base. A conversao para evento de folha fica preparada para evolucao.',
          },
        ],
        keywords: ['banco de horas', 'saldo', 'credito', 'debito'],
      },
      {
        page: 'workSchedules',
        title: 'Escala',
        audience: 'RH, operacao e gestao autorizada',
        summary:
          'Planeje quem trabalha, quando trabalha e em qual operacao, com foco em feriados, plantoes e datas especiais.',
        objective:
          'Organizar o previsto da operacao antes da execucao real da jornada, com visibilidade de equipe, horarios e conflitos.',
        whenToUse:
          'Use para montar cobertura de feriado, eventos, finais de semana, cliente especifico ou plantao operacional.',
        steps: [
          'Clique em Nova Escala e defina nome, tipo e periodo.',
          'Informe local, cliente e horario padrao da operacao.',
          'Adicione os colaboradores escalados e ajuste horarios individuais quando necessario.',
          'Revise os conflitos apontados para ferias, afastamentos, inatividade ou sobreposicao.',
          'Salve como rascunho ou publique quando a escala estiver validada.',
        ],
        bestPractices: [
          'Use nomes claros para identificar rapidamente cada operacao.',
          'Revise conflitos antes de publicar feriados e plantoes.',
          'Prefira separar escalas grandes por cliente, turno ou data especial.',
        ],
        commonMistakes: [
          'Publicar escala sem revisar colaboradores inativos ou em ferias.',
          'Misturar operacoes diferentes na mesma escala sem clareza de local.',
          'Usar a escala como historico do realizado; ela representa o previsto.',
        ],
        faq: [
          {
            question: 'Escala substitui a Folha de Ponto?',
            answer:
              'Nao. Escala representa o planejamento. A Folha de Ponto mostra o realizado depois da operacao.',
          },
          {
            question: 'Ja gera reflexo automatico na folha?',
            answer:
              'Nesta fase a estrutura fica pronta para evolucao futura, mas sem calculo financeiro automatico.',
          },
        ],
        keywords: ['escala', 'plantao', 'feriado', 'operacao', 'cliente'],
      },
    ],
  },
  {
    key: 'departamentoPessoal',
    title: 'Departamento Pessoal',
    description:
      'Competencias de folha, holerites e eventos que sustentam a operacao mensal de DP.',
    modules: [
      {
        page: 'payroll',
        title: 'Folha de Pagamento',
        audience: 'Departamento Pessoal e RH autorizado',
        summary:
          'Opere a competencia mensal: abrir, carregar colaboradores, lancar eventos, processar previa e fechar.',
        objective:
          'Dar controle operacional e rastreavel para o ciclo mensal da folha.',
        whenToUse:
          'Use no processamento mensal ou quando precisar revisar uma competencia da folha.',
        steps: [
          'Abra a competencia do mes.',
          'Revise colaboradores elegiveis.',
          'Lance eventos variaveis quando necessario.',
          'Processe a previa.',
          'Revise bruto, descontos, liquido e inconsistencias.',
          'Feche a competencia quando estiver validada.',
        ],
        bestPractices: [
          'Nao feche competencia sem revisar holerites e totais.',
          'Reprocesse apos ajustes importantes.',
          'Use reabertura apenas com justificativa operacional.',
        ],
        commonMistakes: [
          'Editar dados depois de fechar sem reabrir corretamente.',
          'Processar folha sem colaboradores elegiveis.',
          'Confundir evento fixo com lancamento variavel.',
        ],
        faq: [
          {
            question: 'Posso reabrir uma competencia?',
            answer:
              'Sim, desde que o perfil tenha permissao e a reabertura fique rastreavel.',
          },
        ],
        keywords: ['folha', 'competencia', 'processar', 'fechar'],
      },
      {
        page: 'payslips',
        title: 'Holerites',
        audience: 'Departamento Pessoal e RH autorizado',
        summary:
          'Consulte demonstrativos gerados pela folha processada por colaborador e competencia.',
        objective:
          'Permitir conferencia, preview e historico mensal dos demonstrativos de pagamento.',
        whenToUse:
          'Use apos processar a folha para validar valores antes de qualquer exportacao final.',
        steps: [
          'Filtre por competencia ou colaborador.',
          'Abra o preview do holerite.',
          'Confira proventos, descontos, bruto e liquido.',
          'Use exportacao quando a rotina estiver validada.',
        ],
        bestPractices: [
          'Confira amostras antes de fechar folha.',
          'Valide divergencias no modulo Folha de Pagamento.',
          'Nao use holerite sem competencia processada.',
        ],
        commonMistakes: [
          'Esperar holerite sem processamento de folha.',
          'Conferir liquido sem olhar descontos detalhados.',
        ],
        faq: [
          {
            question: 'Holerite vem de onde?',
            answer:
              'Do resultado consolidado da competencia processada na Folha de Pagamento.',
          },
        ],
        keywords: ['holerite', 'demonstrativo', 'liquido', 'proventos'],
      },
      {
        page: 'payrollEvents',
        title: 'Eventos da Folha',
        audience: 'Departamento Pessoal',
        summary:
          'Catalogo de rubricas usadas na folha, com tipo, calculo, incidencias e status.',
        objective:
          'Padronizar proventos, descontos e informativos usados no processamento.',
        whenToUse:
          'Use para cadastrar, revisar, ativar ou inativar rubricas da folha.',
        steps: [
          'Cadastre codigo, nome e tipo do evento.',
          'Defina calculo, valor padrao e incidencias.',
          'Marque se o evento e fixo, variavel ou manual.',
          'Ative apenas eventos prontos para uso.',
        ],
        bestPractices: [
          'Nao altere evento usado em competencia fechada sem criterio.',
          'Use codigos consistentes com a rotina de DP.',
          'Inative eventos antigos em vez de apagar.',
        ],
        commonMistakes: [
          'Classificar desconto como provento.',
          'Esquecer incidencia de INSS, FGTS ou IRRF quando aplicavel.',
        ],
        faq: [
          {
            question: 'Evento inativo entra na folha?',
            answer:
              'Nao deve entrar em novos processamentos.',
          },
        ],
        keywords: ['evento', 'rubrica', 'provento', 'desconto', 'incidencia'],
      },
      {
        page: 'payrollCharges',
        title: 'Encargos',
        audience: 'Departamento Pessoal',
        summary:
          'Consolide bases e valores estimados de encargos por competencia processada.',
        objective:
          'Dar visao de conferencia sobre bases de INSS, FGTS, IRRF e totais operacionais.',
        whenToUse:
          'Use apos processar a folha para revisar bases e consolidacao da competencia.',
        steps: [
          'Escolha a competencia.',
          'Revise base INSS, FGTS e IRRF.',
          'Confira colaboradores considerados.',
          'Marque conferencia quando a rotina estiver validada.',
        ],
        bestPractices: [
          'Use como painel de conferencia, nao como apuracao legal final.',
          'Compare encargos com eventos e holerites.',
        ],
        commonMistakes: [
          'Assumir que estimativa substitui conferencia contabil.',
          'Conferir encargos sem folha processada.',
        ],
        faq: [
          {
            question: 'Encargos sao calculo legal definitivo?',
            answer:
              'Nesta fase sao consolidadores operacionais preparados para evolucao.',
          },
        ],
        keywords: ['encargos', 'inss', 'fgts', 'irrf', 'base'],
      },
    ],
  },
  {
    key: 'gestao',
    title: 'Gestao',
    description:
      'Visao executiva, relatorios, planejamento, capacitacao e recrutamento.',
    modules: [
      {
        page: 'dashboard',
        title: 'Dashboard',
        audience: 'CEO, RH e gestores',
        summary:
          'Painel executivo para risco, pendencias, tendencias e prioridades do dia.',
        objective:
          'Orientar decisao rapida com indicadores consolidados de RH e operacao.',
        whenToUse:
          'Use diariamente para entender o que exige acao, risco ou acompanhamento.',
        steps: [
          'Comece pelos cards executivos do topo.',
          'Revise Previsao de risco e Central de atencao do dia.',
          'Analise tendencias e ranking por setor.',
          'Use acoes rapidas para ir ao modulo de origem.',
        ],
        bestPractices: [
          'Leia risco junto com pendencias, nao isoladamente.',
          'Use o dashboard como triagem, nao como registro final.',
          'Investigue colaboradores e setores com recorrencia.',
        ],
        commonMistakes: [
          'Ignorar pendencias criticas por parecerem pequenas.',
          'Comparar indicadores sem considerar periodo.',
        ],
        faq: [
          {
            question: 'Dashboard substitui relatorio?',
            answer:
              'Nao. Dashboard orienta decisao rapida. Relatorios formalizam consulta e exportacao.',
          },
        ],
        keywords: ['dashboard', 'risco', 'indicadores', 'prioridade'],
      },
      {
        page: 'reports',
        title: 'Relatorios',
        audience: 'CEO, RH e areas autorizadas',
        summary:
          'Gere previews e exportacoes em Excel/PDF por periodo, modulo e filtros especificos.',
        objective:
          'Permitir consulta executiva e operacional sem exportacao cega.',
        whenToUse:
          'Use quando precisar consolidar dados por periodo, apresentar informacoes ou auditar resultados.',
        steps: [
          'Selecione o tipo de relatorio.',
          'Informe data inicial e data final.',
          'Aplique filtros complementares.',
          'Revise a previa na tela.',
          'Exporte em Excel ou PDF somente apos validar os dados.',
        ],
        bestPractices: [
          'Sempre revise a previa antes de exportar.',
          'Use periodos objetivos para evitar relatórios grandes demais.',
          'Registre filtros usados quando o relatorio for enviado para diretoria.',
        ],
        commonMistakes: [
          'Exportar sem conferir preview.',
          'Misturar relatorios sensiveis com usuarios sem permissao.',
          'Usar periodo errado para folha ou auditoria.',
        ],
        faq: [
          {
            question: 'Excel e PDF usam os mesmos filtros?',
            answer:
              'Sim. A exportacao deve respeitar os filtros usados na previa.',
          },
        ],
        keywords: ['relatorio', 'excel', 'pdf', 'periodo', 'exportar'],
      },
      {
        page: 'trainings',
        title: 'Treinamentos',
        audience: 'RH e gestores',
        summary:
          'Acompanhe treinamentos, certificados, validade e historico por colaborador.',
        objective:
          'Organizar capacitacoes e preparar alertas futuros de vencimento e reciclagem.',
        whenToUse:
          'Use para registrar treinamento concluido, anexar certificado ou acompanhar vencimentos.',
        steps: [
          'Selecione colaborador ou treinamento.',
          'Informe categoria, carga horaria e instituicao.',
          'Registre conclusao e validade quando aplicavel.',
          'Anexe certificado e revise status.',
        ],
        bestPractices: [
          'Use validade para treinamentos obrigatorios.',
          'Mantenha certificado anexado ao registro.',
          'Revise proximos vencimentos com antecedencia.',
        ],
        commonMistakes: [
          'Cadastrar certificado sem data de conclusao.',
          'Nao informar validade de treinamento obrigatorio.',
        ],
        faq: [
          {
            question: 'Certificado tem link permanente?',
            answer:
              'A estrutura foi pensada para manter referencia estavel do certificado.',
          },
        ],
        keywords: ['treinamento', 'certificado', 'validade', 'capacitacao'],
      },
      {
        page: 'recruitment',
        title: 'Recrutamento e Selecao',
        audience: 'RH',
        summary:
          'Organize candidatos em pipeline com etapas, origem, status e base para triagem inteligente.',
        objective:
          'Dar visao do funil e preparar a transicao futura de candidato para pre-admissao.',
        whenToUse:
          'Use ao cadastrar candidato, acompanhar vaga ou mover pessoas entre etapas.',
        steps: [
          'Cadastre candidato, contato e vaga.',
          'Classifique origem e etapa do processo.',
          'Acompanhe cards por triagem, entrevista, avaliacao e aprovacao.',
          'Quando aprovado, prepare transicao para pre-admissao.',
        ],
        bestPractices: [
          'Atualize status logo apos cada contato.',
          'Use observacoes objetivas.',
          'Mantenha banco de talentos organizado.',
        ],
        commonMistakes: [
          'Deixar candidato sem vaga ou etapa.',
          'Misturar candidato aprovado com colaborador ativo.',
        ],
        faq: [
          {
            question: 'Recrutamento cria colaborador?',
            answer:
              'Nao diretamente. Ele prepara o caminho para pre-admissao e depois colaborador.',
          },
        ],
        keywords: ['recrutamento', 'candidato', 'pipeline', 'vaga'],
      },
      {
        page: 'performance',
        title: 'Desempenho',
        audience: 'Gestoras, RH e diretoria autorizada',
        summary:
          'Avalie colaboradores cruzando jornada, pontualidade, assiduidade, feedbacks, treinamentos e avaliação gerencial.',
        objective:
          'Dar uma visão gerencial e rastreável da evolução do colaborador, com nota final ponderada e plano de desenvolvimento.',
        whenToUse:
          'Use em ciclos de avaliação, acompanhamento de desempenho, definição de plano de melhoria ou leitura executiva de evolução.',
        steps: [
          'Selecione o colaborador e o período de análise.',
          'Revise a nota consolidada e os critérios automáticos de jornada e treinamentos.',
          'Registre avaliação da gestora com eficiência, postura, pontos fortes e pontos de atenção.',
          'Inclua feedback interno ou externo quando houver evidência relevante.',
          'Use o plano de desenvolvimento para indicar ações e treinamentos recomendados.',
        ],
        bestPractices: [
          'Use evidências de jornada, treinamentos e ocorrências para apoiar a avaliação.',
          'Separe feedback objetivo de opinião sem contexto.',
          'Revise evolução em períodos comparáveis antes de concluir tendência.',
        ],
        commonMistakes: [
          'Avaliar apenas pela nota manual sem observar dados automáticos.',
          'Ignorar treinamentos pendentes no plano de desenvolvimento.',
          'Registrar feedback externo sem contexto do serviço prestado.',
        ],
        faq: [
          {
            question: 'A nota é calculada no frontend?',
            answer:
              'Não. A composição da nota é centralizada no backend para manter rastreabilidade e critério único.',
          },
          {
            question: 'Treinamentos são duplicados nesse módulo?',
            answer:
              'Não. Desempenho lê os registros de Treinamentos e usa a situação como parte da análise.',
          },
        ],
        keywords: ['desempenho', 'avaliacao', 'feedback', 'treinamento', 'pontualidade'],
      },
      {
        page: 'vacations',
        title: 'Ferias',
        audience: 'RH e gestores',
        summary:
          'Acompanhe planejamento de ferias, proximos inicios e impacto operacional.',
        objective:
          'Evitar conflitos de escala e dar visibilidade aos afastamentos planejados.',
        whenToUse:
          'Use para planejar, consultar ou acompanhar periodos de ferias.',
        steps: [
          'Selecione colaborador e periodo.',
          'Revise datas de inicio e retorno.',
          'Acompanhe proximos eventos no dashboard e calendario.',
        ],
        bestPractices: [
          'Planeje com antecedencia.',
          'Revise impacto por setor.',
          'Evite sobreposicao critica em equipes pequenas.',
        ],
        commonMistakes: [
          'Cadastrar periodo sem conferir conflitos.',
          'Nao atualizar retorno planejado.',
        ],
        faq: [
          {
            question: 'Ferias aparecem no calendario?',
            answer:
              'Sim, quando registradas de forma adequada para o periodo.',
          },
        ],
        keywords: ['ferias', 'calendario', 'planejamento'],
      },
      {
        page: 'calendar',
        title: 'Calendario',
        audience: 'RH, gestores e diretoria',
        summary:
          'Visualize eventos operacionais importantes como ferias, prazos, agenda e alertas.',
        objective:
          'Dar leitura temporal das ocorrencias e compromissos do RH.',
        whenToUse:
          'Use para consultar proximos eventos e antecipar impactos operacionais.',
        steps: [
          'Revise eventos do periodo.',
          'Filtre por tipo quando necessario.',
          'Use eventos como apoio ao planejamento de RH.',
        ],
        bestPractices: [
          'Confira calendario antes de fechar escalas.',
          'Use com dashboard para priorizar a semana.',
        ],
        commonMistakes: [
          'Olhar apenas lista e esquecer eventos futuros.',
          'Nao validar origem do evento.',
        ],
        faq: [
          {
            question: 'Calendario substitui modulo de origem?',
            answer:
              'Nao. Ele apresenta a agenda. O registro detalhado fica no modulo de origem.',
          },
        ],
        keywords: ['calendario', 'agenda', 'eventos'],
      },
    ],
  },
];

const fallbackHelp = {
  page: 'help',
  title: 'Central de Ajuda',
  audience: 'Todos os usuarios autenticados',
  summary:
    'Encontre orientacoes, fluxos recomendados, boas praticas e respostas rapidas para usar o EloSystem com seguranca.',
  objective:
    'Ajudar usuarios reais a aprenderem o sistema dentro do proprio produto.',
  whenToUse:
    'Use sempre que tiver duvida sobre um modulo, fluxo ou melhor pratica.',
  steps: [
    'Pesquise pelo modulo ou termo desejado.',
    'Abra o guia completo do modulo.',
    'Siga o passo a passo recomendado.',
  ],
  bestPractices: [
    'Procure primeiro pelo nome do modulo.',
    'Use o assistente flutuante para ajuda contextual.',
  ],
  commonMistakes: [
    'Ignorar o fluxo recomendado antes de operar modulo sensivel.',
  ],
  faq: [
    {
      question: 'A ajuda substitui treinamento?',
      answer:
        'Ela reduz dependencia de treinamento oral, mas processos internos ainda podem exigir alinhamento do RH.',
    },
  ],
  keywords: ['ajuda', 'guia', 'manual', 'suporte'],
};

function getAllHelpModules() {
  return helpSections.flatMap((section) =>
    section.modules.map((module) => ({
      ...module,
      sectionKey: section.key,
      sectionTitle: section.title,
    }))
  );
}

function getHelpForPage(page) {
  return getAllHelpModules().find((module) => module.page === page) || fallbackHelp;
}

const priorityHelpPages = [
  'dashboard',
  'employees',
  'users',
  'rolesPermissions',
  'documents',
  'timesheet',
  'bankHours',
  'workSchedules',
  'payroll',
  'payslips',
  'reports',
  'performance',
  'audit',
  'preadmission',
  'onboarding',
];

function getFeaturedHelpModules() {
  const modules = getAllHelpModules();
  return priorityHelpPages
    .map((page) => modules.find((module) => module.page === page))
    .filter(Boolean);
}

export {
  fallbackHelp,
  getAllHelpModules,
  getFeaturedHelpModules,
  getHelpForPage,
  helpSections,
};
