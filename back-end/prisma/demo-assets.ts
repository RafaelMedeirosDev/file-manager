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
 */
export type DemoAsset = {
  /** Key no bucket, usada verbatim pelo download. */
  key: string;
  /** Nome exibido. NAO inclui a extensao: ela e concatenada no download. */
  name: string;
  extension: string;
  /** O que o objeto contem, para o upload gerar algo plausivel. */
  title: string;
};

export const DEMO_ASSETS: DemoAsset[] = [
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
    title: 'Resultado de exame - TSH (hormonio tireoestimulante)',
  },
  {
    key: 'demo/receita-medica.pdf',
    name: 'Receita medica',
    extension: 'pdf',
    title: 'Receita medica',
  },
  {
    key: 'demo/ultrassom-abdominal.png',
    name: 'Ultrassonografia abdominal',
    extension: 'png',
    title: 'Ultrassonografia abdominal',
  },
  {
    key: 'demo/guia-orientacoes.txt',
    name: 'Orientacoes de preparo',
    extension: 'txt',
    title: 'Orientacoes de preparo para coleta',
  },
];
