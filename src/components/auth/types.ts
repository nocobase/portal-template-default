import type {
  ComponentType,
  LazyExoticComponent,
  ReactNode,
} from "react";

export type Authenticator = {
  name: string;
  authType: string;
  authTypeTitle?: string;
  title?: string;
  options?: Record<string, unknown>;
  sort?: number;
};

export type AuthenticatorComponentProps = {
  authenticator: Authenticator;
};

type AuthenticatorComponent = ComponentType<AuthenticatorComponentProps>;

export type AuthenticatorAdapter = {
  authType: string;
  placement: "form" | "button";
  Component:
    | AuthenticatorComponent
    | LazyExoticComponent<AuthenticatorComponent>;
};

export type RenderAuthenticatorContext = {
  authenticator: Authenticator;
  adapter: AuthenticatorAdapter;
  defaultElement: ReactNode;
};

export type RenderAuthenticator = (
  context: RenderAuthenticatorContext
) => ReactNode;
