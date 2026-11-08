// Setup del proyecto `dom` de vitest (ver `vitest.config.ts`).
//
// `@testing-library/jest-dom` agrega los matchers de DOM (`toBeInTheDocument`,
// `toHaveAttribute`...). `cleanup` desmonta lo renderizado entre tests: sin eso, dos
// tests que rendericen el mismo componente dejan DOS copias en el documento y un
// `getByRole` falla por ambigüedad — un rojo que no habla de lo que se está probando.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);
