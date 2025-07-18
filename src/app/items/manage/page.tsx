import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import { GetAllItemsWithBidsAction } from "./actions";
import DeleteItemButton from "./DeleteItemButton";
import { formatToDollar } from "@/util/currency";
import AuctionFilter from "./AuctionFilter";
import BulkDeleteManager, {
  SelectAllCheckbox,
  ItemCheckbox,
} from "./BulkDeleteManager";
import FeatureToggleButton from "./FeatureToggleButton";
import Pagination from "./Pagination";
import { Item, AuctionType } from "@/types/items";
import GeneratePDFButton from "@/components/GeneratePDFButton";

interface SearchParams {
  page?: string;
  pageSize?: string;
  type?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ManageItemsPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session || !(await isAdmin(session))) {
    redirect("/");
  }

  // Await searchParams to access its properties
  const resolvedSearchParams = await searchParams;
  const { page = "1", pageSize = "10", type } = resolvedSearchParams;
  const currentPage = parseInt(page, 10);
  const currentPageSize = parseInt(pageSize, 10);

  const items: Item[] = await GetAllItemsWithBidsAction(
    currentPage,
    currentPageSize,
  );

  // Sort items consistently by ID to maintain original order (no featured reordering)
  const sortedItems = items.sort((a: Item, b: Item) => {
    return a.id - b.id; // Assuming ID is numeric, use a.id.localeCompare(b.id) if string
  });

  // Filter items based on search params
  const selectedType = type as AuctionType | undefined;
  const filteredItems = selectedType
    ? sortedItems.filter((item: Item) => item.auctionType === selectedType)
    : sortedItems;

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  const formatDateShort = (date: Date): string => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (
    auctionType: string,
    endTime: Date,
    isFeatured: boolean,
    status: string,
  ) => {
    const now = new Date();
    const isExpired = now > new Date(endTime);
    const statusSale = status;

    let statusText = auctionType;
    let statusColor = "bg-gray-500";

    if (auctionType === "draft") {
      statusColor = "bg-gray-500";
    } else if (auctionType === "live") {
      if (isFeatured) {
        statusColor = "bg-purple-700";
        statusText = "🔴 FEATURED LIVE";
      } else {
        statusColor = "bg-yellow-500";
        statusText = "live";
      }
    } else if (auctionType === "regular") {
      statusColor = isExpired ? "bg-red-900" : "bg-blue-800";
      statusText = isExpired ? "regular (ended)" : "regular (active)";
    } else if (auctionType === "direct") {
      statusColor = statusSale === "active" ? "bg-green-900" : "bg-red-900";
      statusText =
        statusSale === "active" ? "direct (active)" : "direct (sold)";
    }

    return (
      <span
        className={`px-2 py-1 rounded-md text-white text-xs whitespace-nowrap ${statusColor}`}
      >
        {statusText}
      </span>
    );
  };

  interface BidStatusInfo {
    display: string;
    amount: string;
    color: string;
    biddername?: string;
    bidderemail?: string;
    bidTime?: Date | null;
    bidderphone?: string;
  }

  const getBidStatusInfo = (item: Item): BidStatusInfo => {
    if (item.auctionType === "direct") {
      return {
        display: "-",
        amount: formatToDollar(item.startingPrice),
        color: "text-green-600",
      };
    }

    if (!item.currentBid) {
      return {
        display: "- Sin pujas -",
        amount: formatToDollar(item.startingPrice),
        color: "text-green-600",
      };
    }

    return {
      display: `- ${item.totalBids} puja${item.totalBids > 1 ? "s -" : " -"}`,
      amount: formatToDollar(item.currentBid),
      color: "text-green-600",
      biddername: item.bidderName || item.bidderEmail || "Unknown",
      bidderemail: item.bidderEmail || "No email",
      bidTime: item.bidTime,
      bidderphone: item.bidderPhone || "No phone",
    };
  };

  // Get unique auction types for filter options
  const auctionTypes: string[] = Array.from(
    new Set(items.map((item: Item) => item.auctionType)),
  );

  return (
    <main className="container mx-auto px-2 sm:px-4 max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          Manage Items
        </h1>
        <GeneratePDFButton />
      </div>

      {/* Client Component for filtering */}
      <AuctionFilter
        auctionTypes={auctionTypes}
        totalItems={items.length}
        filteredCount={filteredItems.length}
      />

      <BulkDeleteManager
        totalItems={filteredItems.length}
        allItemIds={filteredItems.map((item: Item) => item.id)}
      >
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {selectedType
                ? `No ${selectedType} items found`
                : "No items found"}
            </p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            <SelectAllCheckbox itemCount={filteredItems.length} />

            <div className="space-y-2 md:space-y-1">
              {filteredItems.map((item: Item) => {
                const bidInfo = getBidStatusInfo(item);

                return (
                  <div
                    key={item.id}
                    className={`rounded-md p-3 md:py-1 md:px-2 w-full ${
                      item.isFeatured
                        ? "border border-purple-400 bg-purple-50"
                        : "bg-white"
                    }`}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3 mb-3">
                        <ItemCheckbox itemId={item.id} />

                        <div className="w-16 h-16 relative flex-shrink-0 overflow-hidden">
                          {item.imageURL ? (
                            <Image
                              src={item.imageURL}
                              alt={item.name}
                              fill
                              className="object-cover rounded-md"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                              <span className="text-gray-400 text-xs">
                                No Image
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-1 truncate">
                            {item.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            {getStatusBadge(
                              item.auctionType,
                              item.bidEndTime,
                              item.isFeatured,
                              item.status,
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Item Details */}
                      <div className="space-y-2 text-sm">
                        <div className="text-gray-600 text-sm break-words">
                          {item.description &&
                          typeof item.description === "string" &&
                          item.description.length > 100
                            ? `${item.description.substring(0, 100)}...`
                            : item.description}
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-xs">
                              Inicio:
                            </span>
                            <span className="font-medium text-sm">
                              $ {formatToDollar(item.startingPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-xs">
                              Actual:
                            </span>
                            <span
                              className={`font-semibold text-sm ${bidInfo.color}`}
                            >
                              $ {bidInfo.amount}
                            </span>
                          </div>
                          {item.auctionType !== "direct" && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 text-xs">
                                Intervalo:
                              </span>
                              <span className="text-sm">
                                $ {formatToDollar(item.bidInterval)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-xs">
                              Finaliza:
                            </span>
                            <span className="text-sm">
                              {formatDateShort(item.bidEndTime)}
                            </span>
                          </div>
                        </div>

                        {bidInfo.display && (
                          <div className="text-xs text-gray-500 break-words">
                            {bidInfo.display}
                          </div>
                        )}

                        {/* Winner/Buyer Info for Mobile */}
                        {item.auctionType !== "direct" &&
                          bidInfo.bidderemail && (
                            <div className="bg-blue-50 p-2 rounded text-xs w-full">
                              <div className="font-medium text-blue-800 break-words">
                                Ganador: {bidInfo.biddername}
                              </div>
                              <div className="text-blue-600 break-all">
                                {bidInfo.bidderemail}
                              </div>
                              {bidInfo.bidderphone &&
                                bidInfo.bidderphone !== "No phone" && (
                                  <div className="text-blue-600 break-all">
                                    {bidInfo.bidderphone}
                                  </div>
                                )}
                            </div>
                          )}

                        {item.auctionType === "direct" && item.soldToEmail && (
                          <div className="bg-green-50 p-2 rounded text-xs w-full">
                            <div className="font-medium text-green-800 break-words">
                              Vendido a: {item.soldToName || item.soldToEmail}
                            </div>
                            <div className="text-green-600 break-all">
                              {item.soldToEmail}
                            </div>
                            {item.soldToPhone &&
                              item.soldToPhone !== "No phone" && (
                                <div className="text-green-600 break-all">
                                  {item.soldToPhone}
                                </div>
                              )}
                          </div>
                        )}
                      </div>

                      {/* Mobile Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 mt-3 w-full">
                        {item.auctionType === "live" && (
                          <div className="w-full sm:w-auto">
                            <FeatureToggleButton
                              itemId={item.id}
                              isFeatured={item.isFeatured}
                              className="w-full sm:w-auto text-xs px-3 py-2"
                            />
                          </div>
                        )}

                        <Link
                          href={`/items/edit/${item.id}`}
                          className="bg-green-800 hover:bg-green-700 text-white px-3 py-2 rounded-md text-xs flex items-center justify-center w-full sm:w-auto"
                        >
                          Edit
                        </Link>

                        <div className="w-full sm:w-auto flex">
                          <DeleteItemButton
                            itemId={item.id}
                            itemName={item.name}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center gap-4">
                      {/* Checkbox */}
                      <ItemCheckbox itemId={item.id} />

                      <div className="w-20 h-20 relative flex-shrink-0 overflow-hidden">
                        {item.imageURL ? (
                          <Image
                            src={item.imageURL}
                            alt={item.name}
                            fill
                            className="object-cover rounded-md"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                            <span className="text-gray-400 text-xs">
                              No Image
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          {getStatusBadge(
                            item.auctionType,
                            item.bidEndTime,
                            item.isFeatured,
                            item.status,
                          )}
                          <span className="text-xs mr-4">
                            Finaliza: {formatDate(item.bidEndTime)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-1">
                          Descripción: {item.description}
                        </p>
                        <div className="text-sm text-gray-500">
                          <span className="mr-4">
                            Precio inicio: ${" "}
                            {formatToDollar(item.startingPrice)}
                          </span>
                          {item.auctionType !== "direct" && (
                            <span className="mr-4">
                              Intervalo: $ {formatToDollar(item.bidInterval)}
                            </span>
                          )}
                          <span className="font-medium">Precio venta: $ </span>
                          <span
                            className={`mr-4 font-semibold ${bidInfo.color}`}
                          >
                            {bidInfo.amount}
                          </span>
                          <span className="mr-4">{bidInfo.display}</span>
                          {item.auctionType !== "direct" &&
                            bidInfo.bidderemail && (
                              <>
                                <span className="font-medium mr-4 text-blue-600">
                                  Ganador: {bidInfo.biddername}
                                </span>
                                <span className="mr-4">
                                  Contacto: {bidInfo.bidderemail}
                                </span>
                                <span className="mr-4">
                                  Cel: {bidInfo.bidderphone || "No phone"}
                                </span>
                              </>
                            )}
                          {item.auctionType === "direct" &&
                            item.soldToEmail && (
                              <>
                                <span className="font-medium mr-4 text-blue-600">
                                  Vendido a:{" "}
                                  {item.soldToName || item.soldToEmail}
                                </span>
                                <span className="mr-4">
                                  Contacto: {item.soldToEmail}
                                </span>
                                <span className="mr-4">
                                  Cel: {item.soldToPhone || "No phone"}
                                </span>
                              </>
                            )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex gap-2 items-center">
                        {/* Only show feature toggle for live auctions */}
                        {item.auctionType === "live" && (
                          <FeatureToggleButton
                            itemId={item.id}
                            isFeatured={item.isFeatured}
                            className="px-3 py-2 text-sm font-medium"
                          />
                        )}

                        <Link
                          href={`/items/edit/${item.id}`}
                          className="bg-green-800 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm flex items-center"
                        >
                          Edit
                        </Link>

                        <DeleteItemButton
                          itemId={item.id}
                          itemName={item.name}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </BulkDeleteManager>

      {/* Pagination Controls */}
      <Pagination currentPage={currentPage} pageSize={currentPageSize} />
    </main>
  );
}
