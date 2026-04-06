import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RequirementsChecklist, { type RequirementRow } from "../RequirementsChecklist";

export default async function PropertyRequirementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: property }, { data: requirements }] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, address_line_1, address_line_2, city, postcode, property_type, bedrooms"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("property_compliance_requirements")
      .select(
        "id, property_id, compliance_type_id, is_required, notes, compliance_types(code, name, description)"
      )
      .eq("property_id", id)
      .order("compliance_types(name)", { ascending: true }),
  ]);

  if (!property) notFound();

  const address = [
    property.address_line_1,
    property.address_line_2,
    property.city,
    property.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/properties/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          Back to property
        </Link>

        <h1 className="text-2xl font-semibold text-gray-900">
          Edit requirements
        </h1>
        <p className="mt-1 text-sm text-gray-500">{address}</p>

        <div className="mt-3 flex flex-wrap gap-3">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {property.property_type}
          </span>
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Select the compliance items that apply to this property. Uncheck
        anything that is not relevant — for example, gas safety for properties
        without gas, or HMO licence for single-tenancy properties.
      </p>

      {!requirements || requirements.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400">
          No compliance requirements found for this property.
        </div>
      ) : (
        <RequirementsChecklist
          initialRequirements={requirements as unknown as RequirementRow[]}
        />
      )}
    </div>
  );
}
