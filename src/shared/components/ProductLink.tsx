import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { routes } from "../routes";

export function ProductLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link to={routes.product(id)} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}
