import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Partner } from '../partners/partner.entity';

export const CurrentPartner = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Partner => {
    const request = ctx.switchToHttp().getRequest<{ partner: Partner }>();
    return request.partner;
  },
);
