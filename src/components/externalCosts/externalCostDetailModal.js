import { Modal } from "@carbon/react";

// for now, we can assume that the "Name" is resourceType
export const ExternalCostDetails = ({ row, onClose }) => {
  const details = [
    { label: "Account Name", value: row.account_name },
    { label: "Aggregate", value: row.aggregate },
    { label: "Charge Category", value: row.charge_category },
    { label: "Cost", value: row.cost },
    { label: "Cost Source", value: row.cost_source },
    { label: "Cost Type", value: row.cost_type },
    { label: "Description", value: row.description },
    { label: "Domain", value: row.domain },
    { label: "ID", value: row.id },
    { label: "List Unit Price", value: row.list_unit_price },
    { label: "Provider ID", value: row.provider_id },
    { label: "Resource Name", value: row.resource_name },
    { label: "Resource Type", value: row.resource_type },
    { label: "Usage Quantity", value: row.usage_quantity },
    { label: "Usage Unit", value: row.usage_unit },
    { label: "Zone", value: row.zone },
  ];

  return (
    <Modal
      open={true}
      onRequestClose={onClose}
      modalHeading={row.resource_type}
      passiveModal
      size="md"
    >
      <div style={{ padding: "1rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {details.map((item, idx) => (
              <tr
                key={idx}
                style={{ borderBottom: "1px solid var(--border-color)" }}
              >
                <td
                  style={{
                    padding: "0.75rem",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                >
                  {item.label}
                </td>
                <td style={{ padding: "0.75rem" }}>{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
