import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { routes } from "../routes";

/** Link to a promotion's detail page; usable inside clickable table rows. */
export function PromotionLink({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Link to={routes.promotion(id)} onClick={(e) => e.stopPropagation()}>
      {children}
    </Link>
  );
}
