import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Property = {
  id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  property_type: string;
  bedrooms: number;
};

type RequiredItem = {
  id: string;
  compliance_types: {
    code: string;
    name: string;
    description: string | null;
  } | null;
};

async function fetchPropertyDetails(id: string): Promise<{
  property: Property | null;
  requiredItems: RequiredItem[];
}> {
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
      .select("id, compliance_types(code, name, description)")
      .eq("property_id", id)
      .eq("is_required", true)
      .order("compliance_types(name)", { ascending: true }),
  ]);

  return {
    property: property ?? null,
    requiredItems: (requirements as unknown as RequiredItem[]) ?? [],
  };
}

export default async function PropertyDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { property, requiredItems } = await fetchPropertyDetails(id);

  if (!property) notFound();

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/properties"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          Back to properties
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {property.address_line_1}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {[property.address_line_2, property.city, property.postcode]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
          <Link
            href={`/properties/${id}/requirements`}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Edit requirements
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {property.property_type}
          </span>
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Required compliance items
        </h2>

        {requiredItems.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-400">
              No compliance items marked as required.
            </p>
            <Link
              href={`/properties/${id}/requirements`}
              className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Set up requirements →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {requiredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 px-6 py-4"
              >
                <div className="flex h-5 items-center pt-0.5">
                  <svg
                    className="h-4 w-4 text-green-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.compliance_types?.name ?? item.id}
                  </p>
                  {item.compliance_types?.description && (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.compliance_types.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
