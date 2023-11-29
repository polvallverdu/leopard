import { Leopard, LeopardWorker } from "../";

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
const INIT_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('INIT_PERFORMANCE_THRESHOLD_SEC'));
const PROC_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('PROC_PERFORMANCE_THRESHOLD_SEC'));

async function testPerformance(
  instance: typeof Leopard | typeof LeopardWorker,
  inputPcm: Int16Array
) {
  const initPerfResults: number[] = [];
  const procPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    let start = Date.now();

    const leopard = await instance.create(
      ACCESS_KEY,
      { publicPath: '/test/leopard_params.pv', forceWrite: true }
    );

    let end = Date.now();
    initPerfResults.push((end - start) / 1000);

    start = Date.now();
    await leopard.process(inputPcm);
    end = Date.now();
    procPerfResults.push((end - start) / 1000);

    if (leopard instanceof LeopardWorker) {
      leopard.terminate();
    } else {
      await leopard.release();
    }
  }

  const initAvgPerf = initPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;
  const procAvgPerf = procPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average init performance: ${initAvgPerf} seconds`);
  // eslint-disable-next-line no-console
  console.log(`Average proc performance: ${procAvgPerf} seconds`);

  expect(initAvgPerf).to.be.lessThan(INIT_PERFORMANCE_THRESHOLD_SEC);
  expect(procAvgPerf).to.be.lessThan(PROC_PERFORMANCE_THRESHOLD_SEC);
}

describe('Leopard binding performance test', () => {
  Cypress.config('defaultCommandTimeout', 160000);

  for (const instance of [Leopard, LeopardWorker]) {
    const instanceString = (instance === LeopardWorker) ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/test.wav').then( async inputPcm => {
        await testPerformance(instance, inputPcm);
      });
    });
  }
});
