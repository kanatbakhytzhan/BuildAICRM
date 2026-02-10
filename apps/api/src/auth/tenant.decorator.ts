import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './jwt.strategy';

export const CurrentUser = createParamDecorator((data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
  const user = ctx.switchToHttp().getRequest().user as RequestUser;
  return data ? user?.[data] : user;
});
