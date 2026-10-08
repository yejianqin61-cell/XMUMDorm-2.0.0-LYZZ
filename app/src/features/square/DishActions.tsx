import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { useSession } from '@/features/auth/session';
import { timetableIdentity } from '@/features/tools/cacheIdentity';
import { toToolsError } from '@/features/tools/requestError';
import { useI18n } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import type { AppError } from '@/i18n/errors';
import { addFavoriteProduct, removeFavoriteProduct, getProductFavoriteStatus } from '../../../../shared/api/canteen';
import { invalidateCanteen } from './canteenCache';

/** Private favorite reads stay separate from the public dish cache. */
export function DishActions({ productId }: { productId: number }): React.ReactElement {
  const session = useSession();
  return <OwnedDishActions key={`${productId}:${timetableIdentity().epoch}:${session.status}`} productId={productId} />;
}
function OwnedDishActions({ productId }: { productId: number }): React.ReactElement {
  const session = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const theme = useTheme();
  const [favorited, setFavorited] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(session.status === 'signedIn');
  const [error, setError] = React.useState<AppError | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const writeBusy = React.useRef(false);
  const mounted = React.useRef(false);
  const authRef = React.useRef(session.handleAuthFailure);
  React.useEffect(() => { authRef.current = session.handleAuthFailure; }, [session.handleAuthFailure]);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const owner = timetableIdentity().epoch;
  React.useEffect(() => {
    if (session.status !== 'signedIn') return;
    let cancelled = false;
    const active = () => !cancelled && owner === timetableIdentity().epoch;
    setBusy(true); setError(null);
    void getProductFavoriteStatus(productId).then((value) => {
      if (!active()) return;
      if (typeof value?.favorited !== 'boolean') throw { kind: 'unknown' };
      setFavorited(value.favorited);
    }).catch(async (failure: unknown) => {
      if (!active()) return;
      const auth = await authRef.current(failure);
      if (active()) setError({ ...toToolsError(failure, auth), target: t('canteen.favorite.title'), params: { rule: t('canteen.favorite.serverRule') } });
    }).finally(() => { if (active()) setBusy(false); });
    return () => { cancelled = true; };
  }, [productId, owner, nonce, session.status, t]);
  const toggle = async () => {
    if (session.status !== 'signedIn') { router.push('/login'); return; }
    if (favorited === null || writeBusy.current || busy) return;
    writeBusy.current = true; setBusy(true); setError(null);
    const active = () => mounted.current && owner === timetableIdentity().epoch;
    let rereading = false;
    try {
      if (favorited) await removeFavoriteProduct(productId); else await addFavoriteProduct(productId);
      if (!active()) return;
      await invalidateCanteen().catch(() => undefined);
      if (active()) { rereading = true; setFavorited(null); setNonce((value) => value + 1); }
    } catch (failure) {
      if (!active()) return;
      const auth = await session.handleAuthFailure(failure);
      if (active()) setError({ ...toToolsError(failure, auth), target: t('canteen.favorite.title'), params: { rule: t('canteen.favorite.serverRule') } });
    } finally { writeBusy.current = false; if (active() && !rereading) setBusy(false); }
  };
  return <View style={{ gap: theme.space('space_2') }}>
    <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
      <Button testID="dish-review" label={t('canteen.review.submit')} disabled={session.status === 'restoring'} onPress={() => session.status === 'signedIn' ? router.push({ pathname: '/canteen/review/[id]', params: { id: String(productId) } }) : router.push('/login')} />
      <Button testID="dish-favorite" variant="secondary" loading={busy} disabled={session.status === 'restoring' || (session.status === 'signedIn' && favorited === null)} label={t(favorited ? 'canteen.favorite.remove' : 'canteen.favorite.add')} onPress={() => void toggle()} />
    </View>
    {error ? <ErrorState testID="dish-favorite-error" error={error} onAction={() => setNonce((value) => value + 1)} /> : null}
  </View>;
}
