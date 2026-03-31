-- Create the missing profile for existing user
INSERT INTO public.profiles (user_id, full_name)
SELECT '647945f7-3a27-446f-850b-f223fa3d0f6c', raw_user_meta_data->>'full_name'
FROM auth.users
WHERE id = '647945f7-3a27-446f-850b-f223fa3d0f6c'
ON CONFLICT DO NOTHING;

-- Recreate the trigger to auto-create profiles for new signups
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();