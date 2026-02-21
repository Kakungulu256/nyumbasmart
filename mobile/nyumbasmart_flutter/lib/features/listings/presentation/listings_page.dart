import 'package:appwrite/models.dart' as models;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/uganda_land_metadata.dart';
import '../../../core/models/listing.dart';
import '../../../core/models/listing_filters.dart';
import '../../auth/data/auth_repository.dart';
import 'listings_controller.dart';

class ListingsPage extends StatefulWidget {
  const ListingsPage({
    required this.controller,
    required this.authRepository,
    super.key,
  });

  final ListingsController controller;
  final AuthRepository authRepository;

  @override
  State<ListingsPage> createState() => _ListingsPageState();
}

class _ListingsPageState extends State<ListingsPage> {
  final _keywordController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  models.User? _currentUser;
  bool _authLoading = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerStateChanged);
    _keywordController.text = widget.controller.filters.keyword;
    _loadCurrentUser();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerStateChanged);
    _keywordController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _loadCurrentUser() async {
    setState(() {
      _authLoading = true;
    });

    final user = await widget.authRepository.getCurrentUser();
    if (!mounted) {
      return;
    }

    setState(() {
      _currentUser = user;
      _authLoading = false;
    });
  }

  void _onControllerStateChanged() {
    if (!mounted) {
      return;
    }
    setState(() {});
  }

  Future<void> _openLoginDialog() async {
    _emailController.clear();
    _passwordController.clear();

    await showDialog<void>(
      context: context,
      builder: (context) {
        var submitting = false;
        String? error;

            return StatefulBuilder(
          builder: (context, setDialogState) {
            Future<void> onSubmit() async {
              setDialogState(() {
                submitting = true;
                error = null;
              });

              try {
                await widget.authRepository.loginWithEmailPassword(
                  email: _emailController.text,
                  password: _passwordController.text,
                );

                if (!mounted) {
                  return;
                }

                Navigator.of(context).pop();
                await _loadCurrentUser();
                if (!mounted) {
                  return;
                }
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Signed in successfully.')),
                );
              } catch (e) {
                if (!context.mounted) {
                  return;
                }
                setDialogState(() {
                  submitting = false;
                  error = 'Unable to sign in. Check credentials and try again.';
                });
              }
            }

            return AlertDialog(
              title: const Text('Sign in'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _passwordController,
                    decoration: const InputDecoration(labelText: 'Password'),
                    obscureText: true,
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    Text(error!, style: const TextStyle(color: Colors.red)),
                  ],
                ],
              ),
              actions: [
                TextButton(
                  onPressed: submitting ? null : () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: submitting ? null : onSubmit,
                  child: submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign in'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _logout() async {
    try {
      await widget.authRepository.logoutCurrentSession();
      if (!mounted) {
        return;
      }
      await _loadCurrentUser();
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Logged out.')),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to log out right now.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final filters = controller.filters;
    final mode = controller.mode;
    final propertyTypes = _propertyTypeOptionsByMode(mode);
    final districtOptions = ugandaDistrictsByRegion[filters.region] ?? const <String>[];

    return Scaffold(
      appBar: AppBar(
        title: const Text('NyumbaSmart Mobile'),
        actions: [
          if (_authLoading)
            const Padding(
              padding: EdgeInsets.only(right: 12),
              child: Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))),
            )
          else if (_currentUser == null)
            TextButton(
              onPressed: _openLoginDialog,
              child: const Text('Sign In'),
            )
          else
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'logout') {
                  _logout();
                }
              },
              itemBuilder: (_) => const [
                PopupMenuItem(
                  value: 'logout',
                  child: Text('Logout'),
                ),
              ],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Center(
                  child: Text(
                    _currentUser!.email,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
              child: SegmentedButton<MarketMode>(
                segments: const [
                  ButtonSegment(value: MarketMode.buy, label: Text('Buy')),
                  ButtonSegment(value: MarketMode.rent, label: Text('Rent')),
                ],
                selected: {mode},
                onSelectionChanged: (selection) {
                  controller.setMode(selection.first);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: SegmentedButton<ListingCategory>(
                segments: const [
                  ButtonSegment(value: ListingCategory.property, label: Text('Property')),
                  ButtonSegment(value: ListingCategory.land, label: Text('Land')),
                ],
                selected: {filters.category},
                onSelectionChanged: (selection) {
                  controller.setCategory(selection.first);
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  SizedBox(
                    width: 280,
                    child: TextField(
                      controller: _keywordController,
                      decoration: InputDecoration(
                        labelText: 'Search',
                        hintText: 'Title, address, city...',
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.search),
                          onPressed: () async {
                            controller.setKeyword(_keywordController.text);
                            await controller.applyKeywordSearch();
                          },
                        ),
                        border: const OutlineInputBorder(),
                      ),
                      onSubmitted: (_) async {
                        controller.setKeyword(_keywordController.text);
                        await controller.applyKeywordSearch();
                      },
                    ),
                  ),
                  if (filters.category == ListingCategory.property)
                    SizedBox(
                      width: 180,
                      child: DropdownButtonFormField<String>(
                        value: filters.propertyType,
                        decoration: const InputDecoration(
                          labelText: 'Property type',
                          border: OutlineInputBorder(),
                        ),
                        items: propertyTypes
                            .map(
                              (type) => DropdownMenuItem(
                                value: type,
                                child: Text(_propertyTypeLabel(type)),
                              ),
                            )
                            .toList(growable: false),
                        onChanged: (value) {
                          if (value != null) {
                            controller.setPropertyType(value);
                          }
                        },
                      ),
                    ),
                  SizedBox(
                    width: 180,
                    child: DropdownButtonFormField<String>(
                      value: filters.region.isEmpty ? null : filters.region,
                      decoration: const InputDecoration(
                        labelText: 'Region',
                        border: OutlineInputBorder(),
                      ),
                      items: ugandaRegionOptions.entries
                          .map(
                            (entry) => DropdownMenuItem(
                              value: entry.key,
                              child: Text(entry.value),
                            ),
                          )
                          .toList(growable: false),
                      onChanged: (value) => controller.setRegion(value ?? ''),
                    ),
                  ),
                  SizedBox(
                    width: 180,
                    child: DropdownButtonFormField<String>(
                      value: filters.district.isEmpty ? null : filters.district,
                      decoration: const InputDecoration(
                        labelText: 'District',
                        border: OutlineInputBorder(),
                      ),
                      items: districtOptions
                          .map((district) => DropdownMenuItem(value: district, child: Text(district)))
                          .toList(growable: false),
                      onChanged: filters.region.isEmpty ? null : (value) => controller.setDistrict(value ?? ''),
                    ),
                  ),
                  if (filters.category == ListingCategory.land)
                    SizedBox(
                      width: 200,
                      child: DropdownButtonFormField<String>(
                        value: filters.landTenureType.isEmpty ? null : filters.landTenureType,
                        decoration: const InputDecoration(
                          labelText: 'Land tenure',
                          border: OutlineInputBorder(),
                        ),
                        items: ugandaLandTenureOptions.entries
                            .map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value)))
                            .toList(growable: false),
                        onChanged: (value) => controller.setLandTenureType(value ?? ''),
                      ),
                    ),
                  OutlinedButton.icon(
                    onPressed: controller.loading ? null : controller.clearFilters,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reset'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _ListingsResult(
                loading: controller.loading,
                error: controller.error,
                listings: controller.items,
                onRetry: controller.load,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ListingsResult extends StatelessWidget {
  const _ListingsResult({
    required this.loading,
    required this.error,
    required this.listings,
    required this.onRetry,
  });

  final bool loading;
  final String error;
  final List<Listing> listings;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (error.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (listings.isEmpty) {
      return const Center(child: Text('No listings match your filters.'));
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
      itemCount: listings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) => _ListingCard(listing: listings[index]),
    );
  }
}

class _ListingCard extends StatelessWidget {
  const _ListingCard({required this.listing});

  final Listing listing;

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(
      symbol: '${listing.currency} ',
      decimalDigits: 0,
    ).format(listing.rentAmount);

    final listingIntent = listing.listingIntent.toLowerCase() == 'sale' ? 'For Sale' : 'For Rent';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Chip(label: Text(listingIntent)),
                const SizedBox(width: 8),
                if (listing.propertyType == 'land' && listing.landTenureType.isNotEmpty)
                  Chip(label: Text(ugandaLandTenureOptions[listing.landTenureType] ?? listing.landTenureType)),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              listing.title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              '$money • ${_propertyTypeLabel(listing.propertyType)}',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text('${listing.address}, ${listing.city}, ${listing.country}'),
            if (listing.region.isNotEmpty || listing.district.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  '${ugandaRegionOptions[listing.region] ?? listing.region}${listing.district.isNotEmpty ? ' • ${listing.district}' : ''}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

List<String> _propertyTypeOptionsByMode(MarketMode mode) {
  if (mode == MarketMode.buy) {
    return const ['all', 'house', 'apartment', 'duplex', 'commercial'];
  }
  return const ['all', 'house', 'apartment', 'duplex', 'studio', 'room', 'commercial'];
}

String _propertyTypeLabel(String value) {
  const labels = {
    'all': 'All property types',
    'house': 'House',
    'land': 'Land',
    'apartment': 'Apartment',
    'duplex': 'Duplex',
    'studio': 'Studio',
    'room': 'Room',
    'commercial': 'Commercial',
  };
  return labels[value] ?? value;
}
