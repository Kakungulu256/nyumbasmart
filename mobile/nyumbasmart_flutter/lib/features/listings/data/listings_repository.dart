import 'package:appwrite/appwrite.dart';

import '../../../core/config/appwrite_config.dart';
import '../../../core/models/listing.dart';
import '../../../core/models/listing_filters.dart';

class ListingsRepository {
  const ListingsRepository({
    required this.databases,
    required this.config,
  });

  final Databases databases;
  final AppwriteConfig config;

  Future<List<Listing>> fetchPublicListings({
    required MarketMode mode,
    required ListingFilters filters,
    int limit = 100,
  }) async {
    var includeKeywordQuery = true;
    var includeLandSchemaFilters = true;
    var includeListingIntentQuery = true;
    AppwriteException? lastError;

    for (var attempt = 0; attempt < 4; attempt += 1) {
      try {
        final response = await databases.listDocuments(
          databaseId: config.databaseId,
          collectionId: config.listingsCollectionId,
          queries: _buildQueries(
            mode: mode,
            filters: filters,
            includeKeywordQuery: includeKeywordQuery,
            includeLandSchemaFilters: includeLandSchemaFilters,
            includeListingIntentQuery: includeListingIntentQuery,
            limit: limit,
          ),
        );

        var listings = response.documents.map(Listing.fromDocument).toList(growable: false);

        if (!includeKeywordQuery && filters.keyword.trim().isNotEmpty) {
          listings = listings.where((listing) => listing.matchesKeyword(filters.keyword)).toList(growable: false);
        }

        return _applyClientCompatibilityFilters(
          listings: listings,
          mode: mode,
          filters: filters,
        );
      } on AppwriteException catch (error) {
        lastError = error;
        final message = (error.message ?? '').toLowerCase();
        var shouldRetry = false;

        if (includeKeywordQuery && message.contains('requires a fulltext index')) {
          includeKeywordQuery = false;
          shouldRetry = true;
        }

        if (includeListingIntentQuery && message.contains('attribute not found in schema') && message.contains('listingintent')) {
          includeListingIntentQuery = false;
          shouldRetry = true;
        }

        if (includeLandSchemaFilters &&
            message.contains('attribute not found in schema') &&
            (message.contains('region') || message.contains('district') || message.contains('landtenuretype'))) {
          includeLandSchemaFilters = false;
          shouldRetry = true;
        }

        if (!shouldRetry) {
          rethrow;
        }
      }
    }

    throw lastError ?? AppwriteException('Unable to load listings.');
  }

  List<String> _buildQueries({
    required MarketMode mode,
    required ListingFilters filters,
    required bool includeKeywordQuery,
    required bool includeLandSchemaFilters,
    required bool includeListingIntentQuery,
    required int limit,
  }) {
    final queries = <String>[
      Query.equal('status', ['available']),
      Query.orderDesc('\$updatedAt'),
      Query.limit(limit),
    ];

    final modeIntent = mode == MarketMode.buy ? 'sale' : 'rent';
    if (includeListingIntentQuery) {
      queries.add(Query.equal('listingIntent', [modeIntent]));
    }

    if (filters.category == ListingCategory.land) {
      queries.add(Query.equal('propertyType', ['land']));
    } else if (filters.propertyType != 'all') {
      queries.add(Query.equal('propertyType', [filters.propertyType]));
    }

    if (includeLandSchemaFilters && filters.region.trim().isNotEmpty) {
      queries.add(Query.equal('region', [filters.region.trim().toLowerCase()]));
    }

    if (includeLandSchemaFilters && filters.district.trim().isNotEmpty) {
      queries.add(Query.equal('district', [filters.district.trim()]));
    }

    if (includeLandSchemaFilters && filters.category == ListingCategory.land && filters.landTenureType.trim().isNotEmpty) {
      queries.add(Query.equal('landTenureType', [filters.landTenureType.trim().toLowerCase()]));
    }

    if (includeKeywordQuery && filters.keyword.trim().isNotEmpty) {
      queries.add(Query.search('title', filters.keyword.trim()));
    }

    if (filters.minPrice != null) {
      queries.add(Query.greaterThanEqual('rentAmount', filters.minPrice!));
    }

    if (filters.maxPrice != null) {
      queries.add(Query.lessThanEqual('rentAmount', filters.maxPrice!));
    }

    return queries;
  }

  List<Listing> _applyClientCompatibilityFilters({
    required List<Listing> listings,
    required MarketMode mode,
    required ListingFilters filters,
  }) {
    final requiredIntent = mode == MarketMode.buy ? 'sale' : 'rent';

    return listings.where((listing) {
      final intent = listing.listingIntent.trim().toLowerCase();
      final effectiveIntent = intent.isEmpty ? 'rent' : intent;
      if (effectiveIntent != requiredIntent) {
        return false;
      }

      if (filters.category == ListingCategory.land && listing.propertyType != 'land') {
        return false;
      }

      if (filters.category == ListingCategory.property && listing.propertyType == 'land') {
        return false;
      }

      return true;
    }).toList(growable: false);
  }
}
