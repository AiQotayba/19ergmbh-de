import { CreatePayrollRunDialog } from "@/components/payroll/CreatePayrollRunDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layouts/PageHeader";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface PayrollRunRow {
  id: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  _count?: { payrolls: number };
}

interface PayrollRow {
  id: string;
  fromDate: string;
  toDate: string;
  totalHours: number;
  absenceHours: number;
  hourlyRate: number;
  salary: number;
  isPaid: boolean;
  employee: { fullName: string };
}

export function PayrollPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("records");
  const [createOpen, setCreateOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const runColumns: TableColumn<PayrollRunRow>[] = useMemo(
    () => [
      {
        key: "fromDate",
        label: t("payroll.from"),
        sortable: true,
        render: (v) => format(new Date(String(v)), "MMM d, yyyy"),
      },
      {
        key: "toDate",
        label: t("payroll.to"),
        sortable: true,
        render: (v) => format(new Date(String(v)), "MMM d, yyyy"),
      },
      {
        key: "createdAt",
        label: t("payroll.created"),
        sortable: true,
        render: (v) => format(new Date(String(v)), "MMM d, yyyy HH:mm"),
      },
      {
        key: "id",
        label: t("common.actions"),
        render: (_, row) => (
          <Button size="sm" variant="outline" onClick={() => navigate(`/payroll/runs/${row.id}`)}>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {t("payroll.viewRun")}
            </span>
          </Button>
        ),
      },
    ],
    [navigate, t],
  );

  const payrollColumns: TableColumn<PayrollRow>[] = useMemo(
    () => [
      {
        key: "employee",
        label: t("payroll.employee"),
        sortable: true,
        render: (_, row) => row.employee.fullName,
      },
      {
        key: "fromDate",
        label: t("payroll.period"),
        sortable: true,
        render: (_, row) =>
          `${format(new Date(row.fromDate), "MMM d")} – ${format(new Date(row.toDate), "MMM d, yyyy")}`,
      },
      {
        key: "totalHours",
        label: t("payroll.workedHours"),
        sortable: true,
        render: (v) => Number(v).toFixed(2),
      },
      {
        key: "absenceHours",
        label: t("payroll.absenceHours"),
        sortable: true,
        render: (v) => Number(v ?? 0).toFixed(2),
      },
      { key: "hourlyRate", label: t("payroll.rate"), render: (v) => `€${Number(v).toFixed(2)}` },
      {
        key: "salary",
        label: t("payroll.salary"),
        sortable: true,
        render: (v) => `€${Number(v).toFixed(2)}`,
      },
      {
        key: "isPaid",
        label: t("payroll.status"),
        sortable: true,
        render: (v) => (
          <Badge variant={v ? "success" : "warning"}>
            {v ? t("payroll.paid") : t("payroll.pending")}
          </Badge>
        ),
      },
    ],
    [t],
  );

  async function markPaid(id: string) {
    setPayingId(id);
    try {
      const res = await api.put(`/payroll/${id}/pay`, {}, {
        showSuccessToast: true,
        successMessage: t("payroll.markedPaid"),
      });
      if (res.isError) throw new Error(res.message);
      queryClient.invalidateQueries({ queryKey: ["payroll-table"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.failed"));
    } finally {
      setPayingId(null);
    }
  }

  const payrollColumnsWithActions: TableColumn<PayrollRow>[] = useMemo(
    () => [
      ...payrollColumns,
      {
        key: "actions",
        label: t("common.actions"),
        render: (_, row) =>
          !row.isPaid ? (
            <Button
              size="sm"
              variant="outline"
              disabled={payingId === row.id}
              onClick={() => void markPaid(row.id)}
            >
              {payingId === row.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("payroll.markPaid")
              )}
            </Button>
          ) : null,
      },
    ],
    [payrollColumns, payingId, t],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("payroll.title")} description={t("payroll.description")} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("payroll.helpTitle")}</CardTitle>
          <Button onClick={() => setCreateOpen(true)}>{t("payroll.createRun")}</Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">{t("payroll.helpText")}</p>
        </CardContent>
      </Card>

      <CreatePayrollRunDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(runId) => {
          setTab("runs");
          navigate(`/payroll/runs/${runId}`);
        }}
      />

      <Tabs
        tabs={[
          { id: "records", label: t("payroll.tabRecords") },
          { id: "runs", label: t("payroll.tabRuns") },
        ]}
        value={tab}
        onChange={setTab}
      />

      <TabPanel active={tab} id="records">
        <DataTable<PayrollRow>
          columns={payrollColumnsWithActions}
          apiEndpoint="/payroll"
          queryKeyPrefix="payroll-table"
          urlKeyPrefix="records"
          enableActions={false}
          searchPlaceholder={t("payroll.recordsSearch")}
        />
      </TabPanel>

      <TabPanel active={tab} id="runs">
        <DataTable<PayrollRunRow>
          columns={runColumns}
          apiEndpoint="/payroll/runs"
          queryKeyPrefix="payroll-runs-table"
          urlKeyPrefix="runs"
          enableActions={false}
          searchPlaceholder={t("payroll.runsSearch")}
        />
      </TabPanel>
    </div>
  );
}
