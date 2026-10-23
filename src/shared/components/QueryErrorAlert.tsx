import { Alert, Button } from "antd";
import { errorMessage } from "../utils/errorMessage";

export function QueryErrorAlert({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Alert
      type="error"
      showIcon
      title="Could not load data"
      description={errorMessage(error)}
      action={
        <Button size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}
