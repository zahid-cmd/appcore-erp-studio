/* ===================================================== 
   IMPORTS 
===================================================== */ 
 
import 
{ 
    Component, 
    Input, 
    inject 
} 
from '@angular/core'; 
 
import 
{ 
    CommonModule 
} 
from '@angular/common'; 
 
import 
{ 
    ConfirmDialogService 
} 
from './confirm-dialog.service'; 
 
/* ===================================================== 
   CONFIRM DIALOG 
===================================================== */ 
 
@Component( 
{ 
    selector: 'app-confirm-dialog', 
 
    standalone: true, 
 
    imports: 
    [ 
        CommonModule 
    ], 
 
    templateUrl: 
        './confirm-dialog.html', 
 
    styleUrl: 
        './confirm-dialog.css' 
}) 
export class ConfirmDialogComponent 
{ 
    /* ===================================================== 
       INPUTS 
    ====================================================== */ 
 
    @Input() 
    previewMode = false; 
 
    /* ===================================================== 
       SERVICES 
    ====================================================== */ 
 
    readonly dialogService = 
        inject( 
            ConfirmDialogService 
        ); 
 
    /* ===================================================== 
       CONFIRM 
    ====================================================== */ 
 
    onConfirm(): void 
    { 
        if (this.previewMode) 
        { 
            return; 
        } 
 
        this.dialogService.confirm(); 
    } 
 
    /* ===================================================== 
       CANCEL 
    ====================================================== */ 
 
    onCancel(): void 
    { 
        if (this.previewMode) 
        { 
            return; 
        } 
 
        this.dialogService.cancel(); 
    } 
 
    /* ===================================================== 
       GET COMMAND ICON 
    ====================================================== */ 
 
    getCommandIcon(): string 
    { 
        const command = 
            this.dialogService
                .command()
                .toLowerCase(); 
 
        if 
        ( 
            command.includes( 'delete' ) 
            || 
            command.includes( 'remove' ) 
            || 
            command.includes( 'unregister' ) 
            || 
            command.includes( 'rollback' ) 
        ) 
        { 
            return 'fas fa-trash'; 
        } 
 
        if 
        ( 
            command.includes( 'migration' ) 
        ) 
        { 
            return 'fas fa-database'; 
        } 
 
        if 
        ( 
            command.includes( 'register' ) 
        ) 
        { 
            return 'fas fa-file-circle-check'; 
        } 
 
        if 
        ( 
            command.includes( 'synchron' ) 
            || 
            command.includes( 'sync' ) 
        ) 
        { 
            return 'fas fa-rotate'; 
        } 
 
        if 
        ( 
            command.includes( 'rebuild' ) 
        ) 
        { 
            return 'fas fa-arrows-rotate'; 
        } 
 
        if 
        ( 
            command.includes( 'create' ) 
        ) 
        { 
            return 'fas fa-plus'; 
        } 
 
        return 'fas fa-circle-exclamation'; 
    } 
 
    /* ===================================================== 
       GET COMMAND ICON CLASS 
    ====================================================== */ 
 
    getCommandIconClass(): string 
    { 
        const command = 
            this.dialogService
                .command()
                .toLowerCase(); 
 
        if 
        ( 
            command.includes( 'delete' ) 
            || 
            command.includes( 'remove' ) 
            || 
            command.includes( 'unregister' ) 
            || 
            command.includes( 'rollback' ) 
        ) 
        { 
            return 'danger'; 
        } 
 
        if 
        ( 
            command.includes( 'register' ) 
        ) 
        { 
            return 'success'; 
        } 
 
        if 
        ( 
            command.includes( 'migration' ) 
            || 
            command.includes( 'create' ) 
            || 
            command.includes( 'synchron' ) 
            || 
            command.includes( 'sync' ) 
            || 
            command.includes( 'rebuild' ) 
        ) 
        { 
            return 'primary'; 
        } 
 
        return 'warning'; 
    } 
}