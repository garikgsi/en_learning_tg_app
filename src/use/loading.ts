import {ref, computed} from "vue";

const loading = ref(false);
export default function useLoading() {

  const setLoading = ( loadingProp:boolean) => {
    loading.value = loadingProp;
  }

  const isLoading = computed(() => loading.value)

  return {
    isLoading,
    setLoading,
  };
}
