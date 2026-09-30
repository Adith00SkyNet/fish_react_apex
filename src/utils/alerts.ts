import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

const theme = {
  confirmButtonColor: '#226a65',
  cancelButtonColor: '#9aa7a5',
  buttonsStyling: true,
  customClass: { popup: 'delfish-alert', title: 'delfish-alert-title', confirmButton: 'delfish-alert-confirm', cancelButton: 'delfish-alert-cancel' },
}

export const alertSuccess = (title: string, text?: string) => Swal.fire({ ...theme, icon: 'success', title, text, timer: 1800, showConfirmButton: false })
export const alertError = (title: string, text?: string) => Swal.fire({ ...theme, icon: 'error', title, text })
export const alertInfo = (title: string, text?: string) => Swal.fire({ ...theme, icon: 'info', title, text })
export const confirmAction = (title: string, text: string) => Swal.fire({ ...theme, icon: 'warning', title, text, showCancelButton: true, confirmButtonText: 'Yes, continue', cancelButtonText: 'Cancel' }).then((result) => result.isConfirmed)
