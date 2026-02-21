import 'package:appwrite/models.dart' as models;

class Listing {
  const Listing({
    required this.id,
    required this.title,
    required this.description,
    required this.listingIntent,
    required this.propertyType,
    required this.rentAmount,
    required this.currency,
    required this.paymentFrequency,
    required this.address,
    required this.city,
    required this.country,
    required this.region,
    required this.district,
    required this.landTenureType,
    required this.latitude,
    required this.longitude,
    required this.status,
    required this.updatedAt,
    required this.imageFileIds,
  });

  factory Listing.fromDocument(models.Document document) {
    final data = document.data;

    return Listing(
      id: document.$id,
      title: _readString(data, 'title'),
      description: _readString(data, 'description'),
      listingIntent: _readString(data, 'listingIntent'),
      propertyType: _readString(data, 'propertyType'),
      rentAmount: _readInt(data, 'rentAmount'),
      currency: _readString(data, 'currency', fallback: 'UGX'),
      paymentFrequency: _readString(data, 'paymentFrequency'),
      address: _readString(data, 'address'),
      city: _readString(data, 'city'),
      country: _readString(data, 'country'),
      region: _readString(data, 'region'),
      district: _readString(data, 'district'),
      landTenureType: _readString(data, 'landTenureType'),
      latitude: _readDouble(data, 'latitude'),
      longitude: _readDouble(data, 'longitude'),
      status: _readString(data, 'status'),
      updatedAt: DateTime.tryParse(document.$updatedAt) ?? DateTime.now(),
      imageFileIds: _readStringList(data, 'imageFileIds'),
    );
  }

  final String id;
  final String title;
  final String description;
  final String listingIntent;
  final String propertyType;
  final int rentAmount;
  final String currency;
  final String paymentFrequency;
  final String address;
  final String city;
  final String country;
  final String region;
  final String district;
  final String landTenureType;
  final double latitude;
  final double longitude;
  final String status;
  final DateTime updatedAt;
  final List<String> imageFileIds;

  bool matchesKeyword(String keyword) {
    final normalized = keyword.trim().toLowerCase();
    if (normalized.isEmpty) {
      return true;
    }

    return <String>[
      title,
      description,
      address,
      city,
      region,
      district,
      propertyType,
    ].any((value) => value.toLowerCase().contains(normalized));
  }
}

String _readString(Map<String, dynamic> data, String key, {String fallback = ''}) {
  final value = data[key];
  if (value is String) {
    return value.trim();
  }
  return fallback;
}

int _readInt(Map<String, dynamic> data, String key) {
  final value = data[key];
  if (value is int) {
    return value;
  }
  if (value is double) {
    return value.round();
  }
  if (value is String) {
    return int.tryParse(value) ?? 0;
  }
  return 0;
}

double _readDouble(Map<String, dynamic> data, String key) {
  final value = data[key];
  if (value is double) {
    return value;
  }
  if (value is int) {
    return value.toDouble();
  }
  if (value is String) {
    return double.tryParse(value) ?? 0;
  }
  return 0;
}

List<String> _readStringList(Map<String, dynamic> data, String key) {
  final value = data[key];
  if (value is! List<dynamic>) {
    return const [];
  }

  return value.whereType<String>().map((item) => item.trim()).where((item) => item.isNotEmpty).toList(growable: false);
}
