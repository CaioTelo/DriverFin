import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'driverfin:is-public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
