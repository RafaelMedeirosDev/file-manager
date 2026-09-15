/**
 * Os objetos do R2 que a organizacao de demonstracao referencia.
 *
 * Esta lista e compartilhada entre dois scripts que nunca rodam juntos:
 *
 *   upload-demo-assets.ts  sobe os objetos. Roda UMA vez, a mao.
 *   seed-demo.ts           insere linhas de `files` apontando para eles.
 *                          Roda todas as noites, e NUNCA toca o R2.
 *
 * A separacao e o que mantem o cron sem credencial de storage: ele so escreve
 * no banco. E como os objetos nunca sao apagados, a reconstrucao noturna
 * reaproveita os mesmos -- o seed nao gera orfaos no bucket.
 *
 * Se um objeto faltar, o download responde 404 e nao 500: DownloadFileUseCase
 * mapeia `NoSuchKey` para FILE_NOT_FOUND. A demo degrada em vez de quebrar.
 *
 * As keys levam o prefixo `demo/`. E uma convencao nova -- todo upload da API
 * grava `<uuid>.<ext>` plano na raiz --, e funciona porque o download usa a
 * key verbatim, sem normalizar nem validar formato.
 *
 * ┌─ ATENCAO ────────────────────────────────────────────────────────────────┐
 * │ Uma MESMA key e referenciada por varias linhas de `files` -- hoje sao     │
 * │ 109 linhas sobre 20 objetos. Isso e deliberado: e o que permite encher a  │
 * │ demo sem transformar o cron num processo que faz upload.                  │
 * │                                                                           │
 * │ A consequencia: NAO ligue exclusao de objeto a exclusao de linha para o   │
 * │ prefixo `demo/`. Apagar o objeto de uma linha faria as outras que         │
 * │ apontam para a mesma key responderem 404. Hoje o soft delete nunca toca   │
 * │ o bucket, entao o risco e latente, nao ativo.                             │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
export type DemoAsset = {
  /** Key no bucket, usada verbatim pelo download. */
  key: string;
  /** Nome exibido. NAO inclui a extensao: ela e concatenada no download. */
  name: string;
  extension: string;
  /**
   * O que o objeto contem, para o upload gerar algo plausivel.
   *
   * Vai direto para dentro do PDF gerado a mao, como literal entre
   * parenteses -- entao `(`, `)` e `\` precisariam de escape. Nenhum title
   * usa esses caracteres, e o mais simples e manter assim.
   */
  title: string;
};

/**
 * Os assets sao agrupados por tema, e cada pasta da demo puxa de um pool so.
 * E o que faz o conteudo de uma pasta chamada "Exames laboratoriais" ser
 * coerente com o nome dela.
 *
 * **Todos os pools tem 5 itens de proposito.** A distribuicao no seed pega 2
 * arquivos por pasta, e `gcd(2, 5) = 1` -- o passo percorre o pool inteiro
 * antes de repetir, em vez de alternar entre dois subconjuntos fixos. Um pool
 * de tamanho par quebraria isso: com 4, o passo de 2 so alcancaria os indices
 * pares. Ver `pickAssets` no seed-demo.ts.
 */

/** Resultados e laudos de analises clinicas. */
export const LAB_ASSETS: DemoAsset[] = [
  {
    key: 'demo/laudo-hemograma.pdf',
    name: 'Laudo - hemograma completo',
    extension: 'pdf',
    title: 'Laudo laboratorial - Hemograma completo',
  },
  {
    key: 'demo/resultado-tsh.pdf',
    name: 'Resultado - TSH',
    extension: 'pdf',
    title: 'Resultado de exame - TSH, hormonio tireoestimulante',
  },
  {
    key: 'demo/laudo-coagulograma.pdf',
    name: 'Laudo - coagulograma',
    extension: 'pdf',
    title: 'Laudo laboratorial - Coagulograma',
  },
  {
    key: 'demo/resultado-glicemia.pdf',
    name: 'Resultado - glicemia de jejum',
    extension: 'pdf',
    title: 'Resultado de exame - Glicemia de jejum',
  },
  {
    key: 'demo/resultado-creatinina.pdf',
    name: 'Resultado - creatinina serica',
    extension: 'pdf',
    title: 'Resultado de exame - Creatinina serica',
  },
];

/**
 * Imagem e seus laudos.
 *
 * So ha UM png em toda a lista, e isso e limitacao real do gerador: o corpo
 * do png e um blob 1x1 fixo no upload-demo-assets.ts, entao dez keys .png
 * seriam dez imagens byte a byte identicas. Os outros dois itens sao os
 * laudos em PDF, que o gerador parametriza pelo title.
 */
export const IMG_ASSETS: DemoAsset[] = [
  {
    key: 'demo/ultrassom-abdominal.png',
    name: 'Ultrassonografia abdominal',
    extension: 'png',
    title: 'Ultrassonografia abdominal',
  },
  {
    key: 'demo/laudo-ultrassom-abdominal.pdf',
    name: 'Laudo - ultrassonografia abdominal',
    extension: 'pdf',
    title: 'Laudo de imagem - Ultrassonografia abdominal',
  },
  {
    key: 'demo/laudo-radiografia-torax.pdf',
    name: 'Laudo - radiografia de torax',
    extension: 'pdf',
    title: 'Laudo de imagem - Radiografia de torax',
  },
  {
    key: 'demo/laudo-tomografia.pdf',
    name: 'Laudo - tomografia computadorizada',
    extension: 'pdf',
    title: 'Laudo de imagem - Tomografia computadorizada de abdome',
  },
  {
    key: 'demo/laudo-ultrassom-obstetrica.pdf',
    name: 'Laudo - ultrassonografia obstetrica',
    extension: 'pdf',
    title: 'Laudo de imagem - Ultrassonografia obstetrica',
  },
];

/** Documentos emitidos pelo profissional. */
export const RX_ASSETS: DemoAsset[] = [
  {
    key: 'demo/receita-medica.pdf',
    name: 'Receita medica',
    extension: 'pdf',
    title: 'Receita medica',
  },
  {
    key: 'demo/atestado-medico.pdf',
    name: 'Atestado medico',
    extension: 'pdf',
    title: 'Atestado medico',
  },
  {
    key: 'demo/encaminhamento.pdf',
    name: 'Encaminhamento para especialista',
    extension: 'pdf',
    title: 'Encaminhamento para avaliacao com especialista',
  },
  {
    key: 'demo/declaracao-comparecimento.pdf',
    name: 'Declaracao de comparecimento',
    extension: 'pdf',
    title: 'Declaracao de comparecimento a consulta',
  },
  {
    key: 'demo/solicitacao-exames.pdf',
    name: 'Solicitacao de exames',
    extension: 'pdf',
    title: 'Solicitacao de exames complementares',
  },
];

/** Orientacoes e termos entregues ao paciente. */
export const GUIDE_ASSETS: DemoAsset[] = [
  {
    key: 'demo/guia-orientacoes.txt',
    name: 'Orientacoes de preparo',
    extension: 'txt',
    title: 'Orientacoes de preparo para coleta',
  },
  {
    key: 'demo/guia-jejum.txt',
    name: 'Instrucoes de jejum',
    extension: 'txt',
    title: 'Instrucoes de jejum antes da coleta',
  },
  {
    key: 'demo/termo-consentimento.txt',
    name: 'Termo de consentimento',
    extension: 'txt',
    title: 'Termo de consentimento para realizacao de exame',
  },
  {
    key: 'demo/resumo-anamnese.txt',
    name: 'Resumo de anamnese',
    extension: 'txt',
    title: 'Resumo de anamnese',
  },
  {
    key: 'demo/orientacoes-pos-exame.txt',
    name: 'Orientacoes pos-exame',
    extension: 'txt',
    title: 'Orientacoes de cuidados apos o exame',
  },
];

/**
 * A lista plana, que e o que o upload-demo-assets.ts percorre.
 *
 * O seed usa os pools acima; o upload nao precisa saber de tema nenhum.
 */
export const DEMO_ASSETS: DemoAsset[] = [
  ...LAB_ASSETS,
  ...IMG_ASSETS,
  ...RX_ASSETS,
  ...GUIDE_ASSETS,
];
