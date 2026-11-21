alter table public.coaching_remote_users
add column profile_photo text
check (
  profile_photo is null or (
    length(profile_photo) <= 120000
    and profile_photo ~ '^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]+=*$'
  )
);
