import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthConcurrencyProbe {
  afterPasswordVerified(): Promise<void> {
    return Promise.resolve();
  }
}
