import { renderHook } from '@testing-library/react-hooks/dom';

import { useLeopard } from '../src';

// @ts-ignore
import leopardParams from '@/leopard_params.js';

// @ts-ignore
import testData from './test_data.json';

const ACCESS_KEY = Cypress.env('ACCESS_KEY');

describe('Leopard binding', () => {
  it('should be able to init via public path', () => {
    const { result } = renderHook(() => useLeopard());

    cy.wrapHook(() =>
      result.current.init(ACCESS_KEY, {
        publicPath: '/test/leopard_params.pv',
        forceWrite: true,
      })
    ).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to load 'leopard_params.pv' with ${result.current.error}`
      ).to.be.true;
    });

    cy.wrapHook(result.current.release).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to release leopard with ${result.current.error}`
      ).to.be.false;
    });
  });

  it('should be able to init via base64', () => {
    const { result } = renderHook(() => useLeopard());

    cy.wrapHook(() =>
      result.current.init(ACCESS_KEY, {
        base64: leopardParams,
        forceWrite: true,
      })
    ).then(() => {
      expect(
        result.current.isLoaded,
        `Failed to load 'leopard_params.js' with ${result.current.error}`
      ).to.be.true;
    });
  });

  it('should show invalid model path error message', () => {
    const { result } = renderHook(() => useLeopard());

    cy.wrapHook(() =>
      result.current.init(ACCESS_KEY, {
        publicPath: '/leopard_params_failed.pv',
        forceWrite: true,
      })
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
      expect(result.current.error?.toString()).to.contain(
        "Error response returned while fetching model from '/leopard_params_failed.pv'"
      );
    });
  });

  it('should show invalid access key error message', () => {
    const { result } = renderHook(() => useLeopard());

    cy.wrapHook(() =>
      result.current.init('', {
        publicPath: '/test/leopard_params.pv',
        forceWrite: true,
      })
    ).then(() => {
      expect(result.current.isLoaded).to.be.false;
      expect(result.current.error?.toString()).to.contain('Invalid AccessKey');
    });
  });

  for (const testInfo of testData.tests.parameters) {
    it(`should be able to process audio file (${testInfo.language})`, () => {
      const { result } = renderHook(() => useLeopard());

      cy.wrapHook(() =>
        result.current.init(
          ACCESS_KEY,
          {
            publicPath:
              testInfo.language === 'en'
                ? `/test/leopard_params.pv`
                : `/test/leopard_params_${testInfo.language}.pv`,
            forceWrite: true,
          },
          {
            enableAutomaticPunctuation: true,
          }
        )
      ).then(() => {
        expect(
          result.current.isLoaded,
          `Failed to load ${testInfo.audio_file} (${testInfo.language}) with ${result.current.error}`
        ).to.be.true;
      });

      cy.getFileObj(`audio_samples/${testInfo.audio_file}`).then(file => {
        cy.wrapHook(() => result.current.processFile(file)).then(() => {
          const transcript = result.current.result?.transcript;
          expect(transcript).to.be.eq(testInfo.transcript);
          result.current.result?.words.forEach(
            ({ word, startSec, endSec, confidence }) => {
              const wordRegex = new RegExp(`${word}`, 'i');
              expect(transcript).to.match(wordRegex);
              expect(startSec).to.be.gt(0);
              expect(endSec).to.be.gt(0);
              expect(confidence).to.be.gt(0).and.lt(1);
            }
          );
        });
      });
    });
  }

  for (const testInfo of testData.tests.parameters) {
    it(`should be able to process audio recording (${testInfo.language})`, () => {
      const { result } = renderHook(() => useLeopard());

      cy.wrapHook(() =>
        result.current.init(
          ACCESS_KEY,
          {
            publicPath:
              testInfo.language === 'en'
                ? `/test/leopard_params.pv`
                : `/test/leopard_params_${testInfo.language}.pv`,
            forceWrite: true,
          },
          {
            enableAutomaticPunctuation: true,
          }
        )
      ).then(() => {
        expect(
          result.current.isLoaded,
          `Failed to load ${testInfo.audio_file} (${testInfo.language}) with ${result.current.error}`
        ).to.be.true;
      });

      cy.wrapHook(result.current.startRecording).then(() => {
        expect(result.current.isRecording).to.be.true;
      });

      cy.mockRecording(`audio_samples/${testInfo.audio_file}`).then(() => {
        cy.wrapHook(result.current.stopRecording).then(() => {
          const transcript = result.current.result?.transcript;
          expect(transcript).to.be.eq(testInfo.transcript);
          expect(result.current.isRecording).to.be.false;
          result.current.result?.words.forEach(
            ({ word, startSec, endSec, confidence }) => {
              const wordRegex = new RegExp(`${word}`, 'i');
              expect(transcript).to.match(wordRegex);
              expect(startSec).to.be.gt(0);
              expect(endSec).to.be.gt(0);
              expect(confidence).to.be.gt(0).and.lt(1);
            }
          );
        });
      });
    });
  }
});
