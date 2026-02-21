enum MarketMode { buy, rent }

enum ListingCategory { property, land }

extension MarketModeLabel on MarketMode {
  String get label => this == MarketMode.buy ? 'Buy' : 'Rent';
}

extension ListingCategoryLabel on ListingCategory {
  String get label => this == ListingCategory.land ? 'Land' : 'Property';
}

class ListingFilters {
  const ListingFilters({
    this.keyword = '',
    this.propertyType = 'all',
    this.category = ListingCategory.property,
    this.region = '',
    this.district = '',
    this.landTenureType = '',
    this.minPrice,
    this.maxPrice,
  });

  final String keyword;
  final String propertyType;
  final ListingCategory category;
  final String region;
  final String district;
  final String landTenureType;
  final int? minPrice;
  final int? maxPrice;

  ListingFilters copyWith({
    String? keyword,
    String? propertyType,
    ListingCategory? category,
    String? region,
    String? district,
    String? landTenureType,
    int? minPrice,
    int? maxPrice,
    bool clearMinPrice = false,
    bool clearMaxPrice = false,
  }) {
    return ListingFilters(
      keyword: keyword ?? this.keyword,
      propertyType: propertyType ?? this.propertyType,
      category: category ?? this.category,
      region: region ?? this.region,
      district: district ?? this.district,
      landTenureType: landTenureType ?? this.landTenureType,
      minPrice: clearMinPrice ? null : (minPrice ?? this.minPrice),
      maxPrice: clearMaxPrice ? null : (maxPrice ?? this.maxPrice),
    );
  }
}
