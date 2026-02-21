import 'package:flutter/foundation.dart';

import '../../../core/models/listing.dart';
import '../../../core/models/listing_filters.dart';
import '../data/listings_repository.dart';

class ListingsController extends ChangeNotifier {
  ListingsController({required ListingsRepository repository}) : _repository = repository;

  final ListingsRepository _repository;

  MarketMode _mode = MarketMode.rent;
  ListingFilters _filters = const ListingFilters();
  List<Listing> _items = const [];
  bool _loading = false;
  String _error = '';

  MarketMode get mode => _mode;
  ListingFilters get filters => _filters;
  List<Listing> get items => _items;
  bool get loading => _loading;
  String get error => _error;

  Future<void> load() async {
    _loading = true;
    _error = '';
    notifyListeners();

    try {
      _items = await _repository.fetchPublicListings(
        mode: _mode,
        filters: _filters,
      );
    } catch (error) {
      _items = const [];
      _error = error.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> setMode(MarketMode mode) async {
    if (_mode == mode) {
      return;
    }

    _mode = mode;
    await load();
  }

  Future<void> setCategory(ListingCategory category) async {
    _filters = _filters.copyWith(
      category: category,
      propertyType: category == ListingCategory.land ? 'land' : 'all',
      landTenureType: category == ListingCategory.land ? _filters.landTenureType : '',
    );
    await load();
  }

  void setKeyword(String keyword) {
    _filters = _filters.copyWith(keyword: keyword);
  }

  Future<void> applyKeywordSearch() async {
    await load();
  }

  Future<void> setPropertyType(String propertyType) async {
    _filters = _filters.copyWith(
      category: ListingCategory.property,
      propertyType: propertyType,
      landTenureType: '',
    );
    await load();
  }

  Future<void> setRegion(String region) async {
    _filters = _filters.copyWith(
      region: region,
      district: '',
    );
    await load();
  }

  Future<void> setDistrict(String district) async {
    _filters = _filters.copyWith(district: district);
    await load();
  }

  Future<void> setLandTenureType(String tenure) async {
    _filters = _filters.copyWith(
      category: ListingCategory.land,
      propertyType: 'land',
      landTenureType: tenure,
    );
    await load();
  }

  Future<void> setPriceRange({int? minPrice, int? maxPrice}) async {
    _filters = _filters.copyWith(
      minPrice: minPrice,
      maxPrice: maxPrice,
      clearMinPrice: minPrice == null,
      clearMaxPrice: maxPrice == null,
    );
    await load();
  }

  Future<void> clearFilters() async {
    _filters = ListingFilters(
      category: _filters.category,
      propertyType: _filters.category == ListingCategory.land ? 'land' : 'all',
    );
    await load();
  }
}
