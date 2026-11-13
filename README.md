# EcoDados - EcoMetrics

MVP acadêmico para registrar consumo de água e energia, registrar geração de resíduos, acompanhar indicadores por período e imprimir um relatório.

## Funcionalidades

- Registros com quantidade, unidade, data e observação opcional.
- Totais por categoria e unidade, filtrados por mês.
- Gráfico de barras dos últimos seis meses.
- Histórico com opção de excluir lançamentos.
- Relatório imprimível pelo navegador.
- Persistência no `localStorage` deste dispositivo.

Os cálculos exibem quantidades registradas e totais por unidade. O projeto não aplica fatores de emissão nem converte consumo em impacto ambiental equivalente porque essas fórmulas não foram fornecidas.

## Tecnologias e execução

React, TypeScript e Vite.

```sh
npm install
npm run dev
```

```sh
npm run build
```

## Cronograma acadêmico

- Planejamento e primeira versão funcional: 14/11/2026.
- Testes, correções e vídeo demonstrativo de até 5 minutos: 21/11/2026.
- Publicação, documentação, relatório técnico em PDF e vídeo de 5 a 10 minutos: 05/12/2026.

Consulte [TASKS.md](./TASKS.md) para o escopo e andamento.
