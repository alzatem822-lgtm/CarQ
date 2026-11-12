import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('compila con los tres módulos', async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    expect(modulo).toBeDefined();
  });
});