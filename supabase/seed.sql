begin;

insert into public.categories(id, name, slug, description) values
  ('10000000-0000-4000-8000-000000000001', 'Running', 'running', 'Lightweight performance for every kilometre.'),
  ('10000000-0000-4000-8000-000000000002', 'Training', 'training', 'Purpose-built equipment for stronger sessions.'),
  ('10000000-0000-4000-8000-000000000003', 'Accessories', 'accessories', 'The details that keep you moving.')
on conflict(id) do nothing;

insert into public.products(id, category_id, slug, name, price, compare_at_price, tagline, description, highlights, images, featured) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'velocity-runner-x1', 'Velocity Runner X1', 1290000, 1590000,
   'Find your next gear.', 'A versatile everyday running shoe with a breathable upper and responsive cushioning.',
   array['Breathable upper', 'Responsive cushioning', 'Everyday running'], array['/images/category-running.jpg'], true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'velocity-tracksuit', 'Velocity Tracksuit', 1890000, 2190000,
   'Move without limits.', 'A streamlined two-piece training set designed for warm-ups, recovery and everyday movement.',
   array['Two-piece set', 'Comfortable stretch', 'Easy layering'], array['/images/velocity-tracksuit.jpg'], true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'strength-gear', 'Strength Training Tee', 490000, null,
   'Built for your next rep.', 'A lightweight training tee with an easy athletic fit for daily workouts.',
   array['Lightweight feel', 'Athletic fit', 'Everyday training'], array['/images/strength-gear.jpg'], true),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000003', 'endurance-pack', 'Endurance Pack', 890000, 990000,
   'Carry your momentum.', 'A compact sports pack with organised storage for your daily training essentials.',
   array['Organised storage', 'Adjustable straps', 'Compact profile'], array['/images/endurance-pack.jpg'], true),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'elite-socks', 'Elite Performance Socks', 190000, null,
   'Comfort in every step.', 'Soft performance socks with a supportive fit for training and everyday wear.',
   array['Supportive fit', 'Soft cushioning', 'Training essential'], array['/images/elite-socks.jpg'], false),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'apex-training-shoe', 'Apex Training Shoe', 1490000, 1790000,
   'Your foundation for progress.', 'A stable training shoe for controlled movement through a varied workout.',
   array['Stable platform', 'Secure fit', 'Versatile training'], array['/images/category-training.jpg'], true),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000003', 'apex-essential-kit', 'Apex Essential Kit', 390000, null,
   'Ready for every session.', 'Practical sports accessories to complete your everyday training setup.',
   array['Everyday essentials', 'Easy to carry', 'Versatile kit'], array['/images/category-accessories.jpg'], false)
on conflict(id) do nothing;

insert into public.product_variants(id, product_id, size, color, swatch, sku, stock) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '39', 'Black', '#111111', 'APX-RUN-BLK-39', 20),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '40', 'Black', '#111111', 'APX-RUN-BLK-40', 25),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '41', 'Black', '#111111', 'APX-RUN-BLK-41', 25),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', '42', 'Orange', '#F97316', 'APX-RUN-ORG-42', 15),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'S', 'Black', '#111111', 'APX-VEL-BLK-S', 12),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'M', 'Black', '#111111', 'APX-VEL-BLK-M', 20),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', 'L', 'Black', '#111111', 'APX-VEL-BLK-L', 16),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'S', 'Black', '#111111', 'APX-TEE-BLK-S', 30),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'M', 'Black', '#111111', 'APX-TEE-BLK-M', 30),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000003', 'L', 'White', '#F5F5F5', 'APX-TEE-WHT-L', 24),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000004', 'One Size', 'Black', '#111111', 'APX-PACK-BLK', 18),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000004', 'One Size', 'Orange', '#F97316', 'APX-PACK-ORG', 12),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000005', 'S/M', 'White', '#F5F5F5', 'APX-SOCK-WHT-SM', 40),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000005', 'L/XL', 'Black', '#111111', 'APX-SOCK-BLK-LXL', 40),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000006', '40', 'Black', '#111111', 'APX-TRAIN-BLK-40', 16),
  ('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000006', '41', 'Black', '#111111', 'APX-TRAIN-BLK-41', 16),
  ('30000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000006', '42', 'White', '#F5F5F5', 'APX-TRAIN-WHT-42', 12),
  ('30000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000007', 'One Size', 'Black', '#111111', 'APX-KIT-BLK', 25)
on conflict(id) do nothing;

insert into public.coupons(id, code, discount_type, amount, min_order, max_uses) values
  ('40000000-0000-4000-8000-000000000001', 'APEX10', 'percent', 10, 500000, 500),
  ('40000000-0000-4000-8000-000000000002', 'FIRST50', 'fixed', 50000, 300000, 200)
on conflict(id) do nothing;

commit;
